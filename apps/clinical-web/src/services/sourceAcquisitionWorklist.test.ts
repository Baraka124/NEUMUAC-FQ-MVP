import {describe,it,expect,vi} from 'vitest';
import {
 decodeSourceAcquisitionWorklist,sourceMetadataFlags,sourcePubMedId,
 summarizeSourceAcquisition,sourceAcquisitionCsv,validTriageChange,
 createSourceAcquisitionService,type SourceAcquisitionRecord
} from './sourceAcquisitionWorklist';
import type {ReadOnlyConfig} from './liveVariants';

const a:SourceAcquisitionRecord={
 id:71,variantId:'18',title:'PubMed article 12345678',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 source:'PubMed',year:2024,pmid:null,doi:null,
 state:'untriaged',note:null,version:0,updatedAt:null,updatedByMe:false,
 auditCount:0,claimPending:0,claimApproved:0,numericApproved:0
};
const b:SourceAcquisitionRecord={
 ...a,id:72,title:'Independent bibliographic entry',pmid:'98765432',
 url:'https://pubmed.ncbi.nlm.nih.gov/98765432/',
 state:'source-located',version:2,
 note:'Full text inspected in the original publication catalogue.',
 updatedAt:'2026-11-16T09:00:00Z',updatedByMe:true,auditCount:2,
 claimPending:1,claimApproved:0,numericApproved:0
};
const envelope=(records:readonly unknown[])=>({
 source:'nfq-acquisition-worklist-v1',total:records.length,records
});
const config:ReadOnlyConfig={
 endpoint:'https://cftr-contract.invalid',publishableKey:'sb_publishable_test_contract',
 enabled:true,accessMode:'anonymous',readTable:'variants'
};
const token=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','contract'].join('.');
describe('14H168 source acquisition and evidence triage',()=>{
 it('loads a complete, actually recorded source inventory',()=>{
  const rows=decodeSourceAcquisitionWorklist(envelope([a,b]));
  expect(rows).toHaveLength(2);
  expect(rows[0].state).toBe('untriaged');
  expect(rows[1].version).toBe(2);
  expect(summarizeSourceAcquisition(rows)).toEqual({
   total:2,variants:1,untriaged:1,metadataFlags:1,
   pending:1,approved:0,numeric:0
  });
 });
 it('metadata warnings are diagnostics, never scientific verifications',()=>{
  expect(sourceMetadataFlags(a)).toEqual([
   'Publication title needs checking','PMID missing from catalogue'
  ]);
  expect(sourceMetadataFlags(b)).toEqual([]);
  expect(sourceMetadataFlags({...b,pmid:'12345678'})).toContain('PMID differs from source URL');
  expect(sourceMetadataFlags({...a,pmid:'12345678',title:'Proper original title'})).toEqual([]);
 });
 it('rejects truncated lists, duplicated references, wrong URL origins and impossible review revisions',()=>{
  expect(()=>decodeSourceAcquisitionWorklist({...envelope([a]),total:154})).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([a,a]))).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([{...a,url:'https://evil.invalid/steal'}]))).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([{...a,variantId:'19',id:0}]))).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([{...a,state:'source-located'}]))).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([{...a,claimApproved:-1}]))).toThrow();
  expect(()=>decodeSourceAcquisitionWorklist(envelope([{...a,updatedAt:'2026-11-16T00:00:00Z'}]))).toThrow();
 });
 it('uses the recorded official PubMed URL only as a candidate metadata identifier',()=>{
  expect(sourcePubMedId(a)).toBe('12345678');
  expect(sourcePubMedId({...a,pmid:'other'})).toBe('12345678');
  expect(sourcePubMedId({...a,url:'https://doi.org/10.1016/test'})).toBeNull();
  expect(sourcePubMedId({...a,url:'https://pubmed.ncbi.nlm.nih.gov/12345678/more'})).toBeNull();
 });
 it('enforces an actual changed status with rationale before mutation',()=>{
  expect(validTriageChange(71,0,'metadata-needs-check','Identifier incomplete in the local catalogue.')).toBe(true);
  expect(validTriageChange(71,0,'untriaged','The publication still needs checking.')).toBe(false);
  expect(validTriageChange(71,-1,'source-located','This text is valid in length.')).toBe(false);
  expect(validTriageChange(71,0,'source-located','Too short')).toBe(false);
 });
 it('sanitizes source titles for CSV spreadsheet formula injection',()=>{
  const exported=sourceAcquisitionCsv([{
   ...a,title:'=IMPORTXML("https://invalid.example","//x")'
  }]);
  expect(exported).toContain('\'=IMPORTXML');
  expect(exported).toContain('Metadata flags');
  expect(exported).not.toContain('\n=IMPORTXML');
 });
 it('requires a genuine signed-in JWT before any worklist request',async()=>{
  const transport=vi.fn();
  const service=createSourceAcquisitionService(config,{getAccessToken:async()=>null},transport as typeof fetch);
  await expect(service.list()).rejects.toThrow();
  await expect(service.triage(71,0,'metadata-needs-check','Missing original source title in the register.')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
 it('requests only the narrow authenticated RPC; no browser-assigned user role',async()=>{
  const transport=vi.fn(async(_url:string,init?:RequestInit)=>{
   const params=JSON.parse(String(init?.body));
   return new Response(JSON.stringify(params.p_action==='list'?envelope([a,b]):{
    source:'nfq-acquisition-worklist-v1',referenceId:71,variantId:'18',
    state:'metadata-needs-check',version:1
   }),{status:200});
  });
  const service=createSourceAcquisitionService(config,{getAccessToken:async()=>token},transport as typeof fetch);
  const rows=await service.list();
  expect(rows).toHaveLength(2);
  const version=await service.triage(71,0,'metadata-needs-check',
   'Catalogue record has no PMID although the URL includes one.');
  expect(version).toBe(1);
  expect(transport).toHaveBeenCalledTimes(2);
  const bodies=transport.mock.calls.map(([,options])=>JSON.parse(String(options?.body)));
  expect(bodies.map(x=>x.p_action)).toEqual(['list','triage']);
  expect(bodies[1].p_expected_version).toBe(0);
  expect(bodies[1].p_reference_id).toBe(71);
  expect(bodies.every(x=>!('user_id' in x)&&!('role' in x))).toBe(true);
 });
});
