import {expect,test,type Page} from '@playwright/test';

const ID='11111111-1111-4111-8111-111111111111';
const cors={'access-control-allow-origin':'*',
 'access-control-allow-methods':'GET,POST,OPTIONS',
 'access-control-allow-headers':'authorization,apikey,content-type,accept'};
const variant={id:18,legacy_name:'R117H',protein_name:'p.Arg117His',
 cdna_name:'c.350G>A',alt_names:[],cftr_class:'IV',class_subtype:'standard',
 validation_count:2,eti_prediction:'responsive',alyftrek_prediction:'unknown',
 eti_evidence_level:null,alyftrek_evidence_level:null,
 eti_evidence_tier:null,alyftrek_evidence_tier:null,
 eti_authority_source:null,alyftrek_authority_source:null,therapy_responsive_drugs:null};
const snapshot={variant_id:'18',kind:'historical-records-only',
 reviewed_source_claims:'not-provided',
 archival:[{id:4,variant_id:'18',source_id:2,eti_response:'non_responsive',
  alyftrek_response:null,confidence:'medium',created_at:'2026-02-09T12:00:00Z'}],
 conflicts:[{id:8,variant_id:'18',field:'eti_prediction',severity:'high',
  resolved:true,detected_at:'2026-02-01T00:00:00Z',resolved_at:'2026-02-03T00:00:00Z'}],
 validations:[]};
const bib=[{id:71,variant_id:18,title:'Documented research source',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',source:'PubMed',
 type:null,category:null,journal:null,year:2024,pmid:'12345678',
 doi:null,quality_score:9,source_weight:1,citation_count:10}];

async function setup(page:Page,role:'verified'|'unassigned'|'public'='verified',
 invalidSnapshot=false,claimRecords:readonly unknown[]=[]){
 let rpc=0;const methods:string[]=[];
 let worklistCalls=0;let datasetCalls=0;
 let triage={
  id:71,variantId:'18',title:'PubMed article 12345678',
  url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
  source:'PubMed',year:2024,pmid:null,doi:null,
  state:'untriaged',note:null,version:0,updatedAt:null,updatedByMe:false,
  auditCount:0,claimPending:0,claimApproved:0,numericApproved:0
 };
 if(role!=='public'){
  const user={id:ID,email:'reviewer@example.org',aud:'authenticated',role:'authenticated',
   app_metadata:{provider:'email',providers:['email']},
   user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const session={access_token:['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','test'].join('.'),
   refresh_token:'synthetic-refresh-token',expires_in:3600,expires_at:1893456000,
   token_type:'bearer',user};
  await page.addInitScript(({key,value})=>window.localStorage.setItem(key,JSON.stringify(value)),
   {key:'sb-cftr-contract-auth-token',value:session});
 }
 await page.route('https://cftr-contract.invalid/**',async route=>{
  const req=route.request(),u=new URL(req.url()),method=req.method();
  if(method==='OPTIONS'){await route.fulfill({status:204,headers:cors});return;}
  methods.push(method+' '+u.pathname);
  if(u.pathname.endsWith('/auth/v1/user')){
   await route.fulfill({status:200,headers:cors,contentType:'application/json',
    body:JSON.stringify({id:ID,email:'reviewer@example.org',
     aud:'authenticated',role:'authenticated',
     app_metadata:{provider:'email',providers:['email']},
     user_metadata:{},created_at:'2026-01-01T00:00:00Z'})});return;
  }
  if(u.pathname.endsWith('/nfq_research_memberships')){
   await route.fulfill({status:200,headers:cors,contentType:'application/json',
    body:JSON.stringify(role==='verified'?[{user_id:ID,role:'reviewer',revoked_at:null}]:[])});
   return;
  }
  if(u.pathname.endsWith('/rpc/nfq_approved_research_dataset')){
   datasetCalls++;
   if(role!=='verified'){
    await route.fulfill({status:403,headers:cors,contentType:'application/json',
     body:JSON.stringify({message:'Active membership required'})});
    return;
   }
   await route.fulfill({status:200,headers:cors,contentType:'application/json',
    body:JSON.stringify({
     source:'nfq-approved-research-dataset-v1',schemaVersion:1,
     snapshotSha256:'a'.repeat(64),
     generatedAt:'2026-11-17T10:00:00Z',total:0,records:[],
     limitations:[
      'Research-only source-level metadata',
      'No patient genotypes, individual outcomes or source sample size verified',
      'No automatic effect estimation, cross-study pooling or response prediction'
     ]
    })});
   return;
  }
  if(u.pathname.endsWith('/rpc/nfq_source_acquisition_worklist')){
   worklistCalls++;
   const data=JSON.parse(req.postData()||'{}');
   if(role!=='verified'){
    await route.fulfill({status:403,headers:cors,contentType:'application/json',
     body:JSON.stringify({message:'Active research membership required'})});
    return;
   }
   if(data.p_action==='triage'){
    if(data.p_reference_id!==71||data.p_expected_version!==triage.version){
     await route.fulfill({status:409,headers:cors,contentType:'application/json',
      body:JSON.stringify({message:'Stale source version'})});return;
    }
    triage={...triage,state:data.p_state,note:data.p_note,version:triage.version+1,
     updatedAt:'2026-11-16T23:00:00Z',updatedByMe:true,auditCount:triage.auditCount+1};
    await route.fulfill({status:200,headers:cors,contentType:'application/json',
     body:JSON.stringify({source:'nfq-acquisition-worklist-v1',
      referenceId:71,variantId:'18',state:triage.state,version:triage.version})});
    return;
   }
   await route.fulfill({status:200,headers:cors,contentType:'application/json',
    body:JSON.stringify({source:'nfq-acquisition-worklist-v1',total:1,records:[triage]})});
   return;
  }
  if(u.pathname.endsWith('/rpc/nfq_reviewed_source_claims')){
   const request=JSON.parse(req.postData()||'{}');
   if(role!=='verified'){
    await route.fulfill({status:403,headers:cors,contentType:'application/json',
     body:JSON.stringify({message:'Research role required'})});
   }else{
    await route.fulfill({status:200,headers:cors,contentType:'application/json',
     body:JSON.stringify({variantId:'18',source:'nfq-double-independent-review-v1',claims:claimRecords})});
   }
   return;
  }
  if(u.pathname.endsWith('/rpc/nfq_research_therapy_source_snapshot')){
   rpc++;
   await route.fulfill({status:role==='verified'?200:403,headers:cors,
    contentType:'application/json',body:JSON.stringify(invalidSnapshot?
     {...snapshot,variant_id:'19'}:snapshot)});
   return;
  }
  let rows:unknown[]=[];
  if(u.pathname.endsWith('/variants'))rows=[variant];
  if(u.pathname.endsWith('/evidence_links'))rows=bib;
  await route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(rows)});
 });
 return {methods,get rpc(){return rpc;},get worklistCalls(){return worklistCalls;},get datasetCalls(){return datasetCalls;}};
}

test('14H165 verified researcher sees 5 real-source-bound categories and review mismatch',async({page})=>{
 const record=await setup(page);
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 const root=page.getByTestId('nfq-research-engines');
 const toggle=root.getByTestId('nfq-research-engines-toggle');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(record.rpc).toBe(0);
 await toggle.click();
 const rows=root.getByTestId('nfq-research-engines-therapies');
 await expect(rows.getByRole('listitem')).toHaveCount(5);
 await expect(root.getByTestId('nfq-research-engines-scope')).toContainText('R117H');
 await expect(root).toContainText('1 linked references');
 await expect(root).toContainText('0 independently reviewed study families');
 // Select the exact ETI row instead of treating a typed archival flag as a reviewed study.
 const etiRow=rows.locator('[data-therapy="ETI"]');
 await expect(etiRow).toContainText('Responsive · database');
 await expect(etiRow).toContainText('Recorded history only');
 await etiRow.getByRole('button').click();
 await expect(etiRow).toContainText('Historical response labels differ');
 await expect(etiRow).toContainText('Historical recorded categories exist');
 expect(record.rpc).toBe(1);
 expect(record.methods.some(m=>m.includes('/search_logs'))).toBe(false);
});

for(const persona of ['unassigned','public'] as const){
 test('14H165 '+persona+' account cannot retrieve protected research source snapshots',async({page})=>{
  const record=await setup(page,persona);
  await page.goto('/#/variants/18');
  await expect(page.locator('#selected-title')).toHaveText('R117H');
  const root=page.getByTestId('nfq-research-engines');
  const toggle=root.getByTestId('nfq-research-engines-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(root).toContainText('Active research membership required');
  await expect(root.getByTestId('nfq-research-engines-therapies')).toHaveCount(0);
  expect(record.rpc).toBe(0);
 });
}

test('14H165 mismatched source response fails closed, not as an empty verified study result',async({page})=>{
 const record=await setup(page,'verified',true);
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 await page.getByTestId('nfq-research-engines-toggle').click();
 await expect(page.getByTestId('nfq-research-engines-content')).toContainText(
  'complete research-source snapshot could not be verified'
 );
 await expect(page.getByTestId('nfq-research-engines-therapies')).toHaveCount(0);
 expect(record.rpc).toBe(1);
});

test('14H166 verified double-review source enters actual five-therapy conflict assessment',async({page})=>{
 const claims=[{
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  revision:1,parentClaimId:null,variantId:'18',referenceId:71,therapy:'ETI',
  scope:'single-variant',genotypePair:null,method:'in-vitro-study',
  finding:'reported-no-response',studyFamilyId:'PMID-12345678',
  locator:'Results · Table 2',rationale:'The recorded in-vitro study endpoint is explicitly documented.',
  endpoint:{code:'sweat-chloride',statistic:'change-from-baseline',unit:'mmol/L',value:-22.4,
   model:'clinical',comparator:'baseline',timepoint:'Day 28'},
  status:'approved',submittedAt:'2026-09-01T10:00:00Z',submittedByMe:false,
  reviewCount:2,canReview:false,reviewedAt:'2026-09-03T10:00:00Z',
  studyStats:{analysisUnit:'not-reported',design:'not-reported',interventionN:null,comparatorN:null,
 uncertaintyType:'not-reported',uncertaintyValue:null,ciLower:null,ciUpper:null,
 uncertaintyTarget:'not-reported',sourceLocator:'not-reported'},
  reviewSeals:[
   'attestation:cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'attestation:dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ],audit:[{action:'approved',at:'2026-09-03T10:00:00Z'}]
 }];
 const record=await setup(page,'verified',false,claims);
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 await page.getByTestId('nfq-research-engines-toggle').click();
 const root=page.getByTestId('nfq-research-engines');
 await expect(root).toContainText('1 independently reviewed study families');
 await expect(root.getByTestId('nfq-claim-endpoint')).toContainText('Sweat chloride');
 await expect(root.locator('[data-therapy="ETI"]')).toContainText('Source disagreement');
 await expect(root.getByTestId('nfq-reviewed-claims')).toContainText('1 active approved');
 await root.locator('[data-therapy="ETI"]').getByRole('button').click();
 await expect(root).toContainText('sweat-chloride');
 await expect(root).toContainText('-22.4');
 await expect(root.locator('[data-therapy="ETI"]')).toContainText('Recorded legacy response category and independently reviewed reports differ');
 expect(record.rpc).toBe(1);
});

test('14H166 source submission UI requires exact bibliographic citation and rationale',async({page})=>{
 const record=await setup(page);
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 await page.getByTestId('nfq-research-engines-toggle').click();
 const root=page.getByTestId('nfq-reviewed-claims');
 await expect(root).toContainText('No source claims have been submitted');
 await root.getByTestId('nfq-source-claim-new').click();
 const form=root.getByTestId('nfq-source-claim-form');
 await expect(form.getByTestId('nfq-source-claim-submit')).toBeDisabled();
 await form.getByTestId('nfq-source-claim-reference').selectOption('71');
 await form.getByPlaceholder('PMID-12345678 or trial accession').fill('PMID-12345678');
 await form.getByPlaceholder('Original paper · Table 2 · outcome').fill('Results · Table 2');
 await form.getByPlaceholder('State the measured endpoint, experimental conditions, and why this finding is applicable.')
  .fill('Experimental endpoint measured under the documented conditions; separate independent reviewers must verify the claim.');
 await expect(form.getByTestId('nfq-source-claim-submit')).toBeEnabled();
 await form.getByTestId('nfq-endpoint-intake').getByText('Experimental endpoint').click();
 await form.getByTestId('nfq-endpoint-code').selectOption('sweat-chloride');
 await form.getByTestId('nfq-endpoint-value').fill('-22.4');
 await form.getByTestId('nfq-endpoint-unit').selectOption('mmol/L');
 await expect(form.getByTestId('nfq-source-claim-submit')).toBeDisabled();
 await form.getByLabel('Reporting statistic').selectOption('change-from-baseline');
 await form.getByLabel('Biological or clinical model').selectOption('clinical');
 await form.getByLabel('Source comparator').selectOption('baseline');
 await form.getByTestId('nfq-endpoint-timepoint').fill('Day 28');
 await expect(form.getByTestId('nfq-source-claim-submit')).toBeEnabled();
 expect(record.methods.filter(x=>x.includes('/rpc/nfq_reviewed_source_claims')).length).toBe(1);
});

test('14H168 verified source acquisition worklist loads real records only after explicit opening',async({page})=>{
 const record=await setup(page);
 await page.goto('/#/evidence');
 const worklist=page.getByTestId('nfq-source-acquisition');
 await expect(worklist.getByTestId('nfq-acquisition-toggle')).toHaveAttribute('aria-expanded','false');
 expect(record.worklistCalls).toBe(0);
 await worklist.getByTestId('nfq-acquisition-toggle').click();
 await expect(worklist.getByTestId('nfq-acquisition-list').getByRole('listitem')).toHaveCount(1);
 await expect(worklist).toContainText('PubMed article 12345678');
 expect(record.worklistCalls).toBe(1);
 await worklist.getByTestId('nfq-acquisition-list').getByRole('button').first().click();
 await expect(worklist).toContainText('PMID missing from catalogue');
 await expect(worklist.getByTestId('nfq-acquisition-save')).toBeDisabled();
 await worklist.getByTestId('nfq-acquisition-state').selectOption('metadata-needs-check');
 await worklist.getByTestId('nfq-acquisition-note').fill(
  'The original PubMed reference URL contains an identifier missing from the local catalogue.'
 );
 await expect(worklist.getByTestId('nfq-acquisition-save')).toBeEnabled();
 await worklist.getByTestId('nfq-acquisition-save').click();
 await expect(worklist).toContainText('Metadata needs checking');
 expect(record.worklistCalls).toBeGreaterThanOrEqual(3);
});

for(const persona of ['unassigned','public'] as const){
 test('14H168 '+persona+' cannot request protected acquisition worklist',async({page})=>{
  const record=await setup(page,persona);
  await page.goto('/#/evidence');
  const worklist=page.getByTestId('nfq-source-acquisition');
  await worklist.getByTestId('nfq-acquisition-toggle').click();
  await expect(worklist).toContainText('Active research membership is required');
  expect(record.worklistCalls).toBe(0);
  await expect(worklist.getByTestId('nfq-acquisition-list')).toHaveCount(0);
 });
}

test('14H168 official PubMed metadata is inspected on demand without rewriting source records',async({page})=>{
 const record=await setup(page);
 let pubmedRequests=0;
 await page.route('https://eutils.ncbi.nlm.nih.gov/**',async route=>{
  pubmedRequests++;
  const url=new URL(route.request().url());
  expect(url.searchParams.get('id')).toBe('12345678');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   result:{uids:['12345678'],'12345678':{
    uid:'12345678',title:'Officially indexed publication title',
    pubtype:['Clinical Trial']
   }}
  })});
 });
 await page.goto('/#/evidence');
 const root=page.getByTestId('nfq-source-acquisition');
 await root.getByTestId('nfq-acquisition-toggle').click();
 await expect(root.getByTestId('nfq-acquisition-list').getByRole('listitem')).toHaveCount(1);
 expect(pubmedRequests).toBe(0);
 await root.getByTestId('nfq-acquisition-list').getByRole('button').first().click();
 await root.getByTestId('nfq-acquisition-pubmed').click();
 await expect(root.getByTestId('nfq-acquisition-pubmed-result')).toContainText('Officially indexed publication title');
 await expect(root).toContainText('Indexed title differs');
 expect(pubmedRequests).toBe(1);
 expect(record.worklistCalls).toBe(1);
});

test('14H169 approved-source dataset loads only after explicit researcher action and reports empty real state',async({page})=>{
 const record=await setup(page,'verified');
 await page.goto('/#/evidence');
 const root=page.getByTestId('nfq-approved-dataset');
 const toggle=root.getByTestId('nfq-dataset-toggle');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(record.datasetCalls).toBe(0);
 await toggle.click();
 await expect(root.getByTestId('nfq-dataset-empty')).toContainText('No independently approved source observations yet');
 await expect(root.getByTestId('nfq-dataset-hash')).toHaveText('a'.repeat(64));
 await expect(root).toContainText('0 approved observations');
 await expect(root.getByTestId('nfq-dataset-export-json')).toBeEnabled();
 expect(record.datasetCalls).toBe(1);
});

for(const persona of ['unassigned','public'] as const){
 test('14H169 '+persona+' cannot request protected approved-source dataset',async({page})=>{
  const record=await setup(page,persona);
  await page.goto('/#/evidence');
  const root=page.getByTestId('nfq-approved-dataset');
  await root.getByTestId('nfq-dataset-toggle').click();
  await expect(root).toContainText('An active research membership is required');
  expect(record.datasetCalls).toBe(0);
  await expect(root.getByTestId('nfq-dataset-export-json')).toHaveCount(0);
 });
}

test('14H170 empty approved-data analysis protocol cannot invent a cohort or model accuracy',async({page})=>{
 const record=await setup(page,'verified');
 await page.goto('/#/evidence');
 const data=page.getByTestId('nfq-approved-dataset');
 await data.getByTestId('nfq-dataset-toggle').click();
 await expect(data.getByTestId('nfq-dataset-empty')).toBeVisible();
 const protocol=data.getByTestId('nfq-analysis-protocol');
 await expect(protocol.getByTestId('nfq-analysis-toggle')).toHaveAttribute('aria-expanded','false');
 await protocol.getByTestId('nfq-analysis-toggle').click();
 await expect(protocol.getByTestId('nfq-analysis-gate')).toContainText('No approved observations');
 await expect(protocol).toContainText('0 context-eligible values');
 await expect(protocol).toContainText('0 exact-context cohorts');
 await expect(protocol.getByTestId('nfq-analysis-export')).toBeEnabled();
 await protocol.getByTestId('nfq-analysis-therapy').selectOption('ETI');
 await protocol.getByTestId('nfq-analysis-endpoint').selectOption('sweat-chloride');
 await expect(protocol.getByTestId('nfq-analysis-gate')).toContainText('No approved observations');
 await expect(protocol.getByTestId('nfq-analysis-cohorts')).toHaveCount(0);
 expect(record.datasetCalls).toBe(1); // Filters are local; no new network access.
});
