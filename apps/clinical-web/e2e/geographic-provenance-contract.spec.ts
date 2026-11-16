import {expect,test,type Page} from '@playwright/test';

/** Deterministic contract fixtures: never connect to the real CFTR database. */
const USER='11111111-1111-4111-8111-111111111111';
const headers={
 'access-control-allow-origin':'*',
 'access-control-allow-methods':'GET,POST,OPTIONS',
 'access-control-allow-headers':'apikey,authorization,content-type,accept'
};
const entry={id:18,legacy_name:'R117H',protein_name:'p.Arg117His',cdna_name:'c.350G>A',
 alt_names:[],cftr_class:'IV',class_subtype:'standard',eti_prediction:'unknown',
 alyftrek_prediction:'unknown',validation_count:1};
const researchRows=[
 {region_code:'12',search_events:26,distinct_sessions:12,
  first_observed_at:'2026-04-01T14:05:10Z',last_observed_at:'2026-05-11T16:00:00Z'},
 {region_code:'13',search_events:23,distinct_sessions:11,
  first_observed_at:'2026-04-15T10:00:00Z',last_observed_at:'2026-05-30T15:08:23Z'}
];

async function setup(page:Page,persona:'verified'|'unassigned'|'public'){
 const requests:{path:string;method:string;body:string|null}[]=[];
 const user={id:USER,email:'research-contract@example.org',aud:'authenticated',role:'authenticated',
  app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 if(persona!=='public'){
  const session={
   access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxODkzNDU2MDAwfQ.test',
   refresh_token:'research-contract-refresh',token_type:'bearer',expires_in:3600,expires_at:1893456000,user
  };
  await page.addInitScript(({key,value})=>window.localStorage.setItem(key,JSON.stringify(value)),
   {key:'sb-cftr-contract-auth-token',value:session});
 }
 await page.route('https://cftr-contract.invalid/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
  if(method==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  requests.push({path,method,body:request.postData()});
  if(path.endsWith('/auth/v1/user')){
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(user)});return;
  }
  if(path.endsWith('/nfq_research_memberships')){
   const membership=persona==='verified'?[{user_id:USER,role:'contributor',revoked_at:null}]:[];
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(membership)});return;
  }
  if(path.endsWith('/rpc/nfq_geographic_research_activity')){
   if(persona!=='verified'||method!=='POST'){
    await route.fulfill({status:403,headers,body:'{}'});return;
   }
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(researchRows)});
   return;
  }
  if(path.endsWith('/variants')){
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify([entry])});return;
  }
  await route.fulfill({status:200,headers,contentType:'application/json',body:'[]'});
 });
 return requests;
}

test('14H164 verified variant globe shows dated source and navigates to the exact region',async({page})=>{
 const requests=await setup(page,'verified');
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 const globe=page.getByTestId('variant-geography-trigger');
 await globe.click();
 const panel=page.getByTestId('variant-geography-popover');
 await expect(panel).toBeVisible();
 const rows=panel.getByTestId('variant-geography-region-link');
 await expect(rows).toHaveCount(2);
 await expect(panel.getByTestId('variant-geography-observed-range'))
  .toContainText('1 Apr 2026 – 30 May 2026 UTC');
 await panel.getByTestId('variant-geography-source-details').locator('summary').click();
 await expect(panel.getByTestId('variant-geography-source-details')).toContainText('CFTR research search logs');
 await expect(panel.getByTestId('variant-geography-source-details')).toContainText('ipapi.co');
 await expect(panel.getByTestId('variant-geography-source-details')).toContainText('GPS');
 await expect(rows.filter({hasText:'Galicia'})).toHaveAttribute('href',/#\/geography\?variant=18&region=12$/);
 await rows.filter({hasText:'Galicia'}).click();
 await expect(page).toHaveURL(/#\/geography\?variant=18&region=12$/);
 const atlas=page.locator('.geo-observatory');
 await expect(atlas.getByLabel('Choose a region')).toHaveValue('12');
 await expect(atlas.locator('path.geo-region[data-region-code="12"]')).toHaveAttribute('aria-pressed','true');
 await expect(atlas.getByTestId('geo-research-selected')).toContainText('26');
 await atlas.getByTestId('geo-source-provenance').locator('summary').click();
 await expect(atlas.getByTestId('geo-observed-range')).toContainText('30 May 2026 UTC');
 const calls=requests.filter(r=>r.path.endsWith('/rpc/nfq_geographic_research_activity'));
 expect(calls.length).toBeGreaterThan(0);
 expect(calls.every(r=>r.method==='POST'&&JSON.parse(r.body||'{}').p_variant_id==='18')).toBe(true);
 expect(requests.some(r=>r.path.endsWith('/search_logs'))).toBe(false);
});

test('14H164 signed-in but unassigned account cannot retrieve geography in the variant globe',async({page})=>{
 const requests=await setup(page,'unassigned');
 await page.goto('/#/variants/18');
 await expect(page.locator('#selected-title')).toHaveText('R117H');
 await page.getByTestId('variant-geography-trigger').click();
 const panel=page.getByTestId('variant-geography-popover');
 await expect(panel).toContainText('Verified research membership required');
 await expect(panel.getByTestId('variant-geography-region-link')).toHaveCount(0);
 expect(requests.filter(r=>r.path.endsWith('/rpc/nfq_geographic_research_activity'))).toHaveLength(0);
});

test('14H164 regional atlas URLs are view-only, canonical and clearable without raw activity',async({page})=>{
 const requests=await setup(page,'public');
 await page.goto('/#/geography?variant=18&region=12');
 const atlas=page.locator('.geo-observatory');
 const picker=atlas.getByLabel('Choose a region');
 await expect(picker).toHaveValue('12');
 await expect(atlas.locator('path.geo-region[data-region-code="12"]')).toHaveAttribute('aria-pressed','true');
 await expect(atlas.getByTestId('geo-research-activity')).toContainText('Available to verified research members only');
 await picker.selectOption('13');
 await expect(page).toHaveURL(/#\/geography\?variant=18&region=13$/);
 await expect(atlas.locator('path.geo-region[data-region-code="13"]')).toHaveAttribute('aria-pressed','true');
 await atlas.getByRole('button',{name:'Clear selection'}).click();
 await expect(page).toHaveURL(/#\/geography\?variant=18$/);
 await expect(picker).toHaveValue('');
 await page.goto('/#/geography?variant=18&region=invalid');
 await expect(atlas.getByLabel('Choose a region')).toHaveValue('');
 expect(requests.some(r=>r.path.endsWith('/rpc/nfq_geographic_research_activity'))).toBe(false);
 expect(requests.some(r=>r.path.endsWith('/search_logs'))).toBe(false);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
