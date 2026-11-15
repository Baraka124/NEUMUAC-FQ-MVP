import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS',
 'access-control-allow-headers':'apikey,authorization,content-type,accept'};
const USER='11111111-1111-4111-8111-111111111111';
const variant=(id:number,name:string,protein:string,cftrClass:string)=>({
 id,legacy_name:name,protein_name:protein,cdna_name:null,alt_names:[],
 cftr_class:cftrClass,class_subtype:'standard',eti_prediction:'unknown',
 alyftrek_prediction:'unknown',validation_count:2
});
const ONE=variant(1,'E831X','p.Glu831Ter','I');
const A=variant(18,'R117H','p.Arg117His','IV');
const B=variant(19,'G551D','p.Gly551Asp','III');
async function setup(page:Page,signedIn=false){
 const methods:string[]=[];
 if(signedIn){
  const user={id:USER,email:'researcher@example.org',aud:'authenticated',role:'authenticated',
   app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const session={access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxODkzNDU2MDAwfQ.test',
   refresh_token:'research-test-refresh',token_type:'bearer',expires_in:3600,expires_at:1893456000,user};
  await page.addInitScript(({key,session})=>{window.localStorage.setItem(key,JSON.stringify(session));},
   {key:'sb-cftr-contract-auth-token',session});
 }
 await page.route('https://cftr-contract.invalid/**',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method();
  if(method==='OPTIONS'){await route.fulfill({status:204,headers:cors});return;}
  const table=url.pathname.split('/').pop();
  if(url.pathname.endsWith('/auth/v1/logout')){
   await route.fulfill({status:204,headers:cors});return;
  }
  if(url.pathname.endsWith('/auth/v1/user')){
   const user={id:USER,email:'researcher@example.org',aud:'authenticated',role:'authenticated',
    app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
   await route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(user)});return;
  }
  if(url.pathname.startsWith('/rest/v1/'))methods.push(method);
  if(method!=='GET'){
   await route.fulfill({status:405,headers:cors});return;
  }
  let rows:unknown[]=[];
  if(table==='variants'){
   const id=url.searchParams.get('id')?.replace(/^eq\./,'');
   const or=url.searchParams.get('or')||'';
   if(id==='1')rows=[ONE];
   else if(id==='18')rows=[A];
   else if(id==='19')rows=[B];
   else if(or.includes('R117H'))rows=[A];
   else if(or.includes('G551D'))rows=[B];
   else if(or.includes('Ambiguous')&&!or.includes('ilike.*Ambiguous*'))rows=[];
   else if(or.includes('Ambiguous'))rows=[A,B];
   else if(!or&&!id)rows=[A,B];
  }
  await route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(rows)});
 });
 return methods;
}

test('14H152 saved worklist independently exports current source metadata and preserves link export',async({page})=>{
 const methods=await setup(page);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 await page.goto('/#/variants/18');
 await expect(page.getByRole('heading',{name:'R117H'})).toBeVisible();
 const save=page.getByTestId('save-current-variant');
 await expect(save).toBeVisible();
 await save.click();
 await expect(save).toHaveAttribute('aria-pressed','true');
 await page.goto('/#/variants/19');
 await expect(page.getByRole('heading',{name:'G551D'})).toBeVisible();
 await page.getByTestId('save-current-variant').click();
 await page.reload();
 await page.getByTestId('saved-variants-toggle').click();
 const saved=page.getByTestId('saved-variants-panel');
 await expect(saved.getByRole('button',{name:/Open saved variant/})).toHaveCount(2);
 const button=saved.getByTestId('saved-snapshot-export');
 await expect(button).toBeEnabled();
 const pending=page.waitForEvent('download');
 await button.click();
 const download=await pending;
 expect(download.suggestedFilename()).toBe('neumuacFQ-saved-records-current.csv');
 const csv=await readFile(await download.path(),'utf8');
 expect(csv).toContain('"18"');
 expect(csv).toContain('"19"');
 expect(csv).toContain('"R117H"');
 expect(csv).toContain('"G551D"');
 expect(csv).toContain('recorded_subtype');
 expect(csv).toContain('recorded_alyftrek');
 expect(csv).toContain('https://127.0.0.1:4175/#/variants/18');
 expect(csv).not.toContain('patient');
 await expect(saved.getByTestId('saved-snapshot-status')).toContainText('2 current catalog records exported');
 await expect(saved.getByRole('button',{name:'Export links · CSV'})).toBeVisible();
 expect(methods.length).toBeGreaterThan(0);
 expect(methods.every(x=>x==='GET')).toBe(true);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('14H152 refuses an inaccessible saved record without exporting partial current metadata',async({page})=>{
 await setup(page);
 await page.addInitScript(()=>window.localStorage.setItem(
  'neumuacfq_saved_variant_ids_v1',JSON.stringify(['18','999'])));
 await page.goto('/#/variants');
 await page.getByTestId('saved-variants-toggle').click();
 const panel=page.getByTestId('saved-variants-panel');
 await expect(panel.getByRole('button',{name:/Open saved variant/})).toHaveCount(2);
 await panel.getByTestId('saved-snapshot-export').click();
 await expect(panel.getByTestId('saved-snapshot-status')).toContainText('No partial scientific export was created');
 await expect(panel.getByRole('button',{name:'Export links · CSV'})).toBeEnabled();
});
test('14H151 canonical one-digit IDs and all-result CSV survive quiet progressive disclosure',async({page})=>{
 const methods=await setup(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/variants');
 await page.getByTestId('nfq-batch-toggle').click();
 await page.getByTestId('nfq-batch-input').fill(Array.from({length:13},(_,i)=>String(i+1)).join('\n'));
 await page.getByTestId('nfq-batch-run').click();
 await expect(page.getByTestId('nfq-batch-summary')).toContainText('1 exact');
 const rows=page.getByTestId('nfq-batch-row');
 await expect(rows).toHaveCount(12);
 await expect(rows.first()).toContainText('E831X');
 await expect(page.getByTestId('nfq-batch-visible-count')).toHaveText('Showing 12 of 13 recorded lookup outcomes');
 const list=page.locator('.nfq-batch-results');
 expect(await list.evaluate(el=>getComputedStyle(el).overflowY)).not.toMatch(/auto|scroll/);
 // Full 13-record export must work while the final result is still hidden.
 const pending=page.waitForEvent('download');
 await page.getByTestId('nfq-batch-export').click();
 const csv=await readFile(await (await pending).path(),'utf8');
 expect(csv).toContain('"1","exact"');
 expect(csv).toContain('"13","not-found"');
 expect(csv).not.toContain('"01"');
 await expect(rows).toHaveCount(12);
 await page.getByTestId('nfq-batch-more').click();
 await expect(rows).toHaveCount(13);
 await expect(page.getByTestId('nfq-batch-more')).toHaveCount(0);
 await expect(page.getByTestId('nfq-batch-visible-count')).toHaveText('Showing 13 of 13 recorded lookup outcomes');
 expect(methods.every(x=>x==='GET')).toBe(true);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 await rows.first().getByRole('button',{name:'Open confirmed variant 1'}).click();
 await expect(page).toHaveURL(/#\/variants\/1/);
 await expect(page.getByRole('heading',{name:'E831X'})).toBeVisible();
});

test('14H149 batch resolves many variants together and never claims an ambiguous result is exact',async({page})=>{
 const methods=await setup(page);
 await page.goto('/#/variants');
 await expect(page.getByTestId('nfq-batch-toggle')).toBeVisible();
 await expect(page.getByTestId('nfq-session-toggle')).toHaveCount(0);
 await page.getByTestId('nfq-batch-toggle').click();
 await expect(page.getByTestId('nfq-batch-panel')).toBeVisible();
 await page.getByTestId('nfq-batch-input').fill('R117H\nG551D\nAmbiguous\nR117H\nbad[]');
 await page.getByTestId('nfq-batch-run').click();
 await expect(page.getByTestId('nfq-batch-summary')).toContainText('2 exact');
 await expect(page.getByTestId('nfq-batch-summary')).toContainText('1 need review');
 const rows=page.getByTestId('nfq-batch-row');
 await expect(rows).toHaveCount(5);
 await expect(rows.nth(2)).toContainText('Candidate records');
 await expect(rows.nth(2).getByRole('button',{name:/Inspect candidate variant/})).toHaveCount(2);
 await expect(rows.nth(3)).toContainText('Repeated input');
 await expect(rows.nth(4)).toContainText('Unclear input');
 const event=page.waitForEvent('download');
 await page.getByTestId('nfq-batch-export').click();
 const file=await event;
 expect(file.suggestedFilename()).toBe('neumuacFQ-batch-lookup.csv');
 const csv=await readFile(await file.path(),'utf8');
 expect(csv).toContain('Unverified search suggestions');
 expect(csv).toContain('"exact"');
 expect(csv).toContain('"candidates"');
 expect(methods.length).toBeGreaterThanOrEqual(4);
 expect(methods.every(x=>x==='GET')).toBe(true);
 await rows.first().getByRole('button',{name:'Open confirmed variant 18'}).click();
 await expect(page).toHaveURL(/#\/variants\/18/);
 await expect(page.getByRole('heading',{name:'R117H'})).toBeVisible();
 await expect(page.getByTestId('nfq-batch-panel')).toHaveCount(0);
});

test('14H149 signed-in clinician explicitly starts and exports only confirmed dossier visits',async({page})=>{
 const methods=await setup(page,true);
 await page.goto('/#/variants');
 await expect(page.getByTestId('nfq-session-toggle')).toBeVisible();
 await page.getByTestId('nfq-session-toggle').click();
 const panel=page.getByTestId('nfq-visit-session');
 await expect(panel).toBeVisible();
 await expect(panel.getByTestId('nfq-session-status')).toContainText('No working session');
 await expect(panel.getByTestId('nfq-session-export')).toBeDisabled();
 await panel.getByTestId('nfq-session-start').click();
 await expect(panel.getByTestId('nfq-session-status')).toContainText('Recording verified dossier opens');
 await expect(panel.getByTestId('nfq-session-entry')).toHaveCount(0);
 const row=page.locator('.record-list button').filter({hasText:'R117H'}).first();
 await expect(row).toBeVisible();
 await row.click();
 await expect(page.getByRole('heading',{name:'R117H'})).toBeVisible();
 await expect(panel.getByTestId('nfq-session-entry')).toHaveCount(1);
 await expect(panel.getByTestId('nfq-session-entry')).toContainText('Class IV');
 await expect(panel.getByTestId('nfq-session-status')).toContainText('1 confirmed opens');
 await panel.getByTestId('nfq-session-pause').click();
 await expect(panel.getByTestId('nfq-session-status')).toContainText('Paused manually');
 await panel.getByTestId('nfq-session-resume').click();
 await expect(panel.getByTestId('nfq-session-status')).toContainText('Recording');
 await panel.getByTestId('nfq-session-end').click();
 await expect(panel.getByTestId('nfq-session-status')).toContainText('Session ended');
 const pending=page.waitForEvent('download');
 await panel.getByTestId('nfq-session-export').click();
 const csv=await readFile(await (await pending).path(),'utf8');
 expect(csv).toContain('/#/variants/18');
 expect(csv).toContain('R117H');
 expect(csv).toContain('Private local working session');
 expect(csv).not.toContain(USER);
 expect(methods.every(x=>x==='GET')).toBe(true);
 await panel.getByTestId('nfq-session-clear').click();
 await expect(panel.getByTestId('nfq-session-entry')).toHaveCount(0);
 await expect(panel.getByTestId('nfq-session-export')).toBeDisabled();
});

test('14H149 batch and signed-in session controls are calm, usable and contained in Midnight and mobile',async({page})=>{
 await setup(page,true);
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,760,1366]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/variants');
  await page.getByTestId('nfq-batch-toggle').click();
  await expect(page.getByTestId('nfq-batch-panel')).toBeVisible();
  expect(await page.getByTestId('nfq-batch-panel').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(15, 29, 48)');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.getByRole('button',{name:'Close batch variant lookup'}).click();
  await page.getByTestId('nfq-session-toggle').click();
  await expect(page.getByTestId('nfq-visit-session')).toBeVisible();
  expect(await page.getByTestId('nfq-visit-session').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(15, 29, 48)');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
