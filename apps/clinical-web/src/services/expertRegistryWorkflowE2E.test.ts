import {describe,it,expect} from 'vitest';
import {createExpertRegistryService} from './expertRegistryService';
import {inspectExpertWorkflow} from '../domain/expertReviewWorkflowAudit';
import {evaluateExpertBenchmark} from '../domain/expertBenchmarkAdjudication';
import type {ReadOnlyConfig,ReadSessionProvider} from './liveVariants';

/** 14H206: synthetic in-memory RPC simulator, not a deployed database test.
 * It tests browser -> authenticated transport -> response decoding -> domain
 * workflow across distinct actors. It cannot establish real RLS security.
 */
const config:ReadOnlyConfig={
 endpoint:'https://test-research.supabase.co',
 publishableKey:'sb_publishable_offline_test_only',
 enabled:true,accessMode:'authenticated'
};
const uid=[
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
];
const tokens=uid.map((_,i)=>[
 'eyJhbGciOiJIUzI1NiJ9',
 'eyJzdWIiOiJvZmZsaW5lLX' + i,
 'c2lnbmF0dXJl'
].join('.'));
const caseId='phe508del-mf-eti-2019',variantId='18',pmid='31697873';
const t=(n:number)=>'2026-11-18T14:00:'+String(n).padStart(2,'0')+'+00:00';
const uuid=(n:number)=>'eeeeeeee-eeee-4eee-8eee-'+String(n).padStart(12,'0');
function mockRegistry(){
 let active=0,serial=0;
 const extracts:Record<string,unknown>[]=[];
 let adjudication:Record<string,unknown>|null=null;
 const audit:Record<string,unknown>[]=[];
 const state=()=>({
  source:'nfq-authenticated-expert-registry-v1',caseId,variantId,
  extracts:[...extracts],adjudication,mapping:null,audit:[...audit]
 });
 const transport=(async (_url:unknown,options?:RequestInit)=>{
  const headers=options?.headers as Record<string,string>|undefined;
  const actor=tokens.indexOf((headers?.Authorization??'').replace(/^Bearer /,''));
  if(actor<0)return new Response('{}',{status:401});
  const body=JSON.parse(String(options?.body)) as {
   p_action:string;p_case_id:string;p_variant_id:string;p_payload:Record<string,unknown>|null
  };
  if(body.p_case_id!==caseId||body.p_variant_id!==variantId)
   return new Response('{}',{status:400});
  if(body.p_action==='list')return Response.json(state());
  if(body.p_action==='submit-extraction'){
   if(extracts.length>=2||extracts.some(e=>e.reviewerId===uid[actor]))
    return new Response('{}',{status:403});
   const p=body.p_payload!;
   ++serial;
   extracts.push({...p,reviewerId:uid[actor],submittedAt:t(serial)});
   audit.push({eventId:uuid(serial),actorId:uid[actor],
    action:'extraction-submitted',at:t(serial)});
   return Response.json(state());
  }
  if(body.p_action==='adjudicate'){
   if(actor<2||extracts.length!==2||adjudication)return new Response('{}',{status:403});
   ++serial;
   const p=body.p_payload!;
   adjudication={...p,adjudicatorId:uid[actor],submittedAt:t(serial)};
   audit.push({eventId:uuid(serial),actorId:uid[actor],
    action:'adjudication-submitted',at:t(serial)});
   return Response.json(state());
  }
  // No attested source mapping exists in this synthetic harness.
  return new Response('{}',{status:403});
 }) as typeof fetch;
 const session:ReadSessionProvider={getAccessToken:async()=>tokens[active]!};
 const service=createExpertRegistryService(config,session,transport);
 return {service,state,setActor:(index:number)=>{active=index;}};
}
const extraction=(finding:'supports'|'does-not-support')=>({
 caseId,variantId,pmid,sourceLocator:'Original publication — Table 2',
 genotypeContext:'Phe508del/minimal-function trial cohort',
 endpoint:'ppFEV1 reported endpoint',
 modelOrCohort:'Randomized clinical trial cohort',
 finding,claimId:null,methodNotes:'Synthetic workflow-only extraction, no trial outcome asserted'
});
describe('14H206 authentication workflow integration (synthetic, no DB)',()=>{
 it('enforces reviewer separation and requires a distinct adjudicator after disagreement',async()=>{
  const {service,setActor}=mockRegistry();
  expect(inspectExpertWorkflow(await service.list(caseId,variantId)).state)
   .toBe('awaiting-first-reviewer');
  setActor(0);
  const first=await service.submitExtraction(caseId,variantId,extraction('supports'));
  expect(inspectExpertWorkflow(first).state).toBe('awaiting-second-reviewer');
  await expect(service.submitExtraction(caseId,variantId,extraction('supports')))
   .rejects.toMatchObject({code:'access-denied'});
  setActor(1);
  const second=await service.submitExtraction(caseId,variantId,extraction('does-not-support'));
  expect(inspectExpertWorkflow(second).state).toBe('awaiting-adjudication');
  expect(evaluateExpertBenchmark({...second,references:[],claims:[]}).disposition)
   .toBe('needs-adjudication');
  setActor(0);
  await expect(service.adjudicate(caseId,variantId,{
   caseId,variantId,finalFinding:'inconclusive',
   sourceLocator:'Original publication — Table 2',
   justification:'Different expert interpretations; reconciliation required',
   acceptedReviewerIds:[uid[0]!,uid[1]!]
  })).rejects.toMatchObject({code:'access-denied'});
  setActor(2);
  const adjudicated=await service.adjudicate(caseId,variantId,{
   caseId,variantId,finalFinding:'inconclusive',
   sourceLocator:'Original publication — Table 2',
   justification:'Independent third reviewer reconciles two synthetic observations',
   acceptedReviewerIds:[uid[0]!,uid[1]!]
  });
  const inspected=inspectExpertWorkflow(adjudicated);
  expect(inspected.state).toBe('awaiting-attested-mapping');
  expect(inspected.externallyValidated).toBe(false);
  expect(evaluateExpertBenchmark({...adjudicated,references:[],claims:[]}).disposition)
   .toBe('awaiting-claim-mapping');
  setActor(3);
  await expect(service.attestMapping(caseId,variantId,{
   caseId,variantId,platformClaimId:uuid(20),
   expertFinding:'inconclusive',claimFinding:'inconclusive',
   expertReportedFinding:null,genotypeContext:'Phe508del/minimal-function trial cohort',
   endpointCode:'ppfev1',endpointTimepoint:'week 24',
   sourceLocator:'Original publication — Table 2',mappingVersion:1
  })).rejects.toMatchObject({code:'access-denied'});
  expect(inspectExpertWorkflow(await service.list(caseId,variantId)).reviewChainComplete).toBe(false);
 });
 it('rejects replay and a third independent extraction slot',async()=>{
  const {service,setActor}=mockRegistry();
  await service.submitExtraction(caseId,variantId,extraction('supports'));
  setActor(1);
  await service.submitExtraction(caseId,variantId,extraction('supports'));
  setActor(2);
  await expect(service.submitExtraction(caseId,variantId,extraction('supports')))
   .rejects.toMatchObject({code:'access-denied'});
  expect((await service.list(caseId,variantId)).extracts).toHaveLength(2);
 });
});
