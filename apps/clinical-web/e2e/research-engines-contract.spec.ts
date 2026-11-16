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

async function setup(page:Page,role:'verified'|'unassigned'|'public'='verified',invalidSnapshot=false){
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
