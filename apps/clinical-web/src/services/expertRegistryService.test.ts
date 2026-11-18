import {describe,it,expect,vi} from 'vitest';
import {createExpertRegistryService} from './expertRegistryService';
import type {ReadOnlyConfig,ReadSessionProvider} from './liveVariants';

const config:ReadOnlyConfig={
 endpoint:'https://research-example.supabase.co',publishableKey:'sb_publishable_research_test_only',
 enabled:true,accessMode:'authenticated'
};
// Construct a non-secret structural token only during the test; never embed a JWT-like literal.
const jwt=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','c2lnbmF0dXJl'].join('.');
const caseId='phe508del-mf-eti-2019',variantId='18';
describe('14H200 expert registry authenticated HTTP boundary',()=>{
 it('rejects anonymous research submissions before transport',async()=>{
  const transport=vi.fn();
  const session:ReadSessionProvider={getAccessToken:async()=>null};
  const service=createExpertRegistryService(config,session,transport as unknown as typeof fetch);
  await expect(service.list(caseId,variantId)).rejects.toMatchObject({
   code:'authentication-required'
  });
  expect(transport).not.toHaveBeenCalled();
 });
 it('rejects publishable key reused as bearer authorization',async()=>{
  const session:ReadSessionProvider={getAccessToken:async()=>config.publishableKey};
  const service=createExpertRegistryService(config,session,vi.fn() as unknown as typeof fetch);
  await expect(service.list(caseId,variantId)).rejects.toMatchObject({code:'authentication-required'});
 });
 it('sends only authenticated RPC requests without browser cookies',async()=>{
  const response={
   source:'nfq-authenticated-expert-registry-v1',caseId,variantId,
   extracts:[],adjudication:null,mapping:null,audit:[]
  };
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify(response),{
   status:200,headers:{'content-type':'application/json'}
  }));
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  const service=createExpertRegistryService(config,session,transport as unknown as typeof fetch);
  expect((await service.list(caseId,variantId)).extracts).toHaveLength(0);
  const [url,options]=transport.mock.calls[0]!;
  expect(url).toContain('/rest/v1/rpc/nfq_expert_reference_registry');
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBe('Bearer '+jwt);
 });
 it('refuses unauthorized results and misidentified source envelopes',async()=>{
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  const denied=vi.fn().mockResolvedValue(new Response('{}',{status:403}));
  await expect(createExpertRegistryService(config,session,denied as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'access-denied'});
  const wrong=vi.fn().mockResolvedValue(new Response(JSON.stringify({
   source:'untrusted',caseId,variantId,extracts:[],adjudication:null,mapping:null,audit:[]
  }),{status:200}));
  await expect(createExpertRegistryService(config,session,wrong as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'schema-mismatch'});
 });

 it('rejects a forged reviewer inventory with no matching immutable audit event',async()=>{
  const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const record={
   caseId,variantId,pmid:'31697873',reviewerId:actor,
   submittedAt:'2026-11-18T11:00:00Z',sourceLocator:'Table 2',
   genotypeContext:'Phe508del/minimal-function',endpoint:'ppFEV1 change',
   modelOrCohort:'Randomized clinical cohort',finding:'inconclusive',
   claimId:null,methodNotes:'Independent blinded evidence extraction'
  };
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({
   source:'nfq-authenticated-expert-registry-v1',caseId,variantId,
   extracts:[record],adjudication:null,mapping:null,audit:[]
  }),{status:200}));
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  await expect(createExpertRegistryService(config,session,transport as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'schema-mismatch'});
 });
 it('rejects a mismatched PubMed identity despite an otherwise well-formed response',async()=>{
  const actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const record={
   caseId,variantId,pmid:'33375403',reviewerId:actor,
   submittedAt:'2026-11-18T11:00:00Z',sourceLocator:'Table 2',
   genotypeContext:'Phe508del/minimal-function',endpoint:'ppFEV1 change',
   modelOrCohort:'Randomized clinical cohort',finding:'inconclusive',
   claimId:null,methodNotes:'Independent blinded evidence extraction'
  };
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({
   source:'nfq-authenticated-expert-registry-v1',caseId,variantId,
   extracts:[record],adjudication:null,mapping:null,audit:[{
    eventId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    action:'extraction-submitted',actorId:actor,at:'2026-11-18T11:00:00Z'
   }]
  }),{status:200}));
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  await expect(createExpertRegistryService(config,session,transport as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'schema-mismatch'});
 });
});
