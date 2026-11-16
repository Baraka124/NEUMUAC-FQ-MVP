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
 return {methods,get rpc(){return rpc;}};
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
  status:'approved',submittedAt:'2026-09-01T10:00:00Z',submittedByMe:false,
  reviewCount:2,canReview:false,reviewedAt:'2026-09-03T10:00:00Z',
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
 await expect(root.locator('[data-therapy="ETI"]')).toContainText('Source disagreement');
 await expect(root.getByTestId('nfq-reviewed-claims')).toContainText('1 active approved');
 await root.locator('[data-therapy="ETI"]').getByRole('button').click();
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
 expect(record.methods.filter(x=>x.includes('/rpc/nfq_reviewed_source_claims')).length).toBe(1);
});
