import {describe,it,expect,vi} from 'vitest';
import {
 decodeApprovedDataset,assessApprovedDataset,approvedDatasetCsv,approvedDatasetJson,
 createApprovedDatasetService
} from './approvedResearchDataset';
import type {ReadOnlyConfig} from './liveVariants';

const a={
 claimId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,variantId:'18',referenceId:71,
 referenceTitle:'Documented CFTR research source',
 referenceUrl:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 referencePmid:'12345678',referenceDoi:null,
 therapy:'ETI',studyFamilyId:'PMID-12345678',scope:'single-variant',genotypePair:null,
 method:'clinical-study',finding:'reported-response',locator:'Results · Table 2',
 endpoint:{code:'sweat-chloride',statistic:'change-from-baseline',
  unit:'mmol/L',value:-22.4,model:'clinical',
  comparator:'baseline',timepoint:'Day 28'},
 studyStats:null,
 studyIdentity:null,
 reviewCount:2,reviewedAt:'2026-11-16T08:00:00Z'
};
const b={
 ...a,claimId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 referenceId:72,referenceTitle:'Second original CFTR source',
 referenceUrl:'https://pubmed.ncbi.nlm.nih.gov/98765432/',
 referencePmid:'98765432',studyFamilyId:'PMID-98765432',
 endpoint:{...a.endpoint,value:-18.2}
};
const raw=(records:unknown[])=>({
 source:'nfq-approved-research-dataset-v1',schemaVersion:1,
 snapshotSha256:'a'.repeat(64),generatedAt:'2026-11-17T12:00:00Z',
 total:records.length,records,limitations:[
  'Research-only source-level metadata',
  'No patient genotypes, individual outcomes or source sample size verified',
  'No automatic effect estimation, cross-study pooling or response prediction'
 ]
});
const config:ReadOnlyConfig={
 endpoint:'https://cftr-contract.invalid',publishableKey:'sb_publishable_contract',
 enabled:true,accessMode:'anonymous',readTable:'variants'
};
const token=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','test'].join('.');
describe('14H169 approved source research dataset',()=>{
 it('admits a complete, correctly versioned empty dataset without synthetic data',()=>{
  const snapshot=decodeApprovedDataset(raw([]));
  expect(snapshot.total).toBe(0);
  expect(assessApprovedDataset(snapshot).numeric).toBe(0);
  expect(approvedDatasetCsv(snapshot)).toContain('endpoint_value');
  expect(JSON.parse(approvedDatasetJson(snapshot)).records).toEqual([]);
 });
 it('keeps negative measurements numeric, distinct studies and exact context',()=>{
  const snapshot=decodeApprovedDataset(raw([a,b]));
  const quality=assessApprovedDataset(snapshot);
  expect(quality.independentStudyFamilies).toBe(2);
  expect(quality.numeric).toBe(2);
  expect(quality.contextBounded).toBe(2);
  expect(quality.groups).toHaveLength(1);
  expect(quality.groups[0].studyFamilies).toBe(2);
  expect(approvedDatasetCsv(snapshot)).toContain(',-22.4,');
  expect(approvedDatasetCsv(snapshot)).not.toContain("'"+'-22.4');
  expect(JSON.parse(approvedDatasetJson(snapshot)).manifest.snapshotSha256).toBe('a'.repeat(64));
 });
 it('does not equate duplicate study-family rows with independent experimental support',()=>{
  const snapshot=decodeApprovedDataset(raw([a,{...b,studyFamilyId:a.studyFamilyId}]));
  const quality=assessApprovedDataset(snapshot);
  expect(quality.independentStudyFamilies).toBe(1);
  expect(quality.groups[0].studyFamilies).toBe(1);
  expect(quality.rows[1].flags).toContain(
   'Multiple source rows from one study family: not independent replication'
  );
 });
 it('preserves missing endpoint and nonstandard units without inventing effect sizes',()=>{
  const snapshot=decodeApprovedDataset(raw([
   {...a,endpoint:null},
   {...b,endpoint:{...b.endpoint,code:'organoid-fis',unit:'study-specific',
    statistic:'absolute',model:'intestinal-organoid',value:26}}
  ]));
  const quality=assessApprovedDataset(snapshot);
  expect(quality.unextracted).toBe(1);
  expect(quality.nonstandardNumeric).toBe(1);
  expect(quality.contextBounded).toBe(0);
  expect(quality.groups).toHaveLength(0);
  expect('modelPrediction' in quality).toBe(false);
 });
 it('rejects unapproved, corrupted, duplicate or incomplete claim datasets',()=>{
  expect(()=>decodeApprovedDataset({...raw([a]),total:2})).toThrow();
  expect(()=>decodeApprovedDataset(raw([a,a]))).toThrow();
  expect(()=>decodeApprovedDataset(raw([{...a,reviewCount:1}]))).toThrow();
  expect(()=>decodeApprovedDataset(raw([{...a,variantId:'19',scope:'genotype-specific',genotypePair:['18','21']}]))).toThrow();
  expect(()=>decodeApprovedDataset(raw([{...a,referenceUrl:'https://invalid.example/'}]))).toThrow();
  expect(()=>decodeApprovedDataset(raw([{...a,endpoint:{...a.endpoint,unit:'pp'}}]))).toThrow();
  expect(()=>decodeApprovedDataset({...raw([]),snapshotSha256:'invalid'})).toThrow();
  expect(()=>decodeApprovedDataset({...raw([]),records:[...Array(1001).fill(a)]})).toThrow();
 });
 it('exports text values safely against spreadsheet formula injection',()=>{
  const row={...a,referenceTitle:'=HYPERLINK("https://invalid.example")'};
  const csv=approvedDatasetCsv(decodeApprovedDataset(raw([row])));
  expect(csv).toContain('reference_title');
  expect(csv).toContain("'=HYPERLINK");
 });
 it('fetches source snapshot via authenticated narrow RPC, without browser-declared role',async()=>{
  const transport=vi.fn(async (_url:string,init?:RequestInit)=>{
   const body=JSON.parse(String(init?.body));
   expect(body).toEqual({});
   return new Response(JSON.stringify(raw([])),{status:200});
  });
  const service=createApprovedDatasetService(
   config,{getAccessToken:async()=>token},transport as typeof fetch
  );
  const data=await service.snapshot();
  expect(data.total).toBe(0);
  expect(transport).toHaveBeenCalledTimes(1);
  const [url,init]=transport.mock.calls[0];
  expect(url).toContain('/rpc/nfq_approved_research_dataset');
  expect(init?.method).toBe('POST');
  expect(JSON.parse(String(init?.body))).not.toHaveProperty('role');
 });
 it('makes no remote request without an authenticated research session',async()=>{
  const transport=vi.fn();
  const service=createApprovedDatasetService(config,{getAccessToken:async()=>null},transport as typeof fetch);
  await expect(service.snapshot()).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
});
