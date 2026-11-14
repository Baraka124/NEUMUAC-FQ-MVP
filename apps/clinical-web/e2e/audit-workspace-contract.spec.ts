import {test,expect,type Page} from '@playwright/test';

// 14H145 · Test-only deterministic read-only records. Never shipped in src.
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS',
 'access-control-allow-headers':'apikey,authorization,content-type,accept'};
async function setup(page:Page,mode:'complete'|'denied'|'mismatch'='complete'){
 const methods:string[]=[];
 await page.route('https://cftr-contract.invalid/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').pop();
  methods.push(req.method());
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:cors});return;}
  if(req.method()!=='GET'){await route.fulfill({status:405,headers:cors,body:'No mutation allowed'});return;}
  if(mode==='denied'&&table==='validation_history'){
   await route.fulfill({status:403,headers:cors,body:'Access denied'});return;
  }
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  const variant=url.searchParams.get('variant_id')?.replace(/^eq\./,'');
  let rows:unknown[]=[];
  if(table==='variants'&&(id==='18'||!id)){
   rows=[{id:18,legacy_name:'R117H',protein_name:'p.Arg117His',cdna_name:null,alt_names:[],
    cftr_class:'IV',class_subtype:null,eti_prediction:'unknown',alyftrek_prediction:'unknown',validation_count:1}];
  }
  if(table==='validation_history'&&variant==='18'){
   rows=[{id:2,variant_id:mode==='mismatch'?19:18,action:'REVIEWED',
    created_at:'2026-11-01T12:00:00Z',confidence_level:'Recorded',snapshot_cftr_class:'IV'}];
  }
  if(table==='contradictions'&&variant==='18'){
   rows=[{id:3,variant_id:18,field:'recorded_class',severity:'HIGH',
    resolved:true,detected_at:'2026-09-01T12:00:00Z',resolved_at:null}];
  }
  await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(rows)});
 });
 return methods;
}

test('variant-scoped recorded chronology is connected, filterable and downloadable without writes',async({page})=>{
 const methods=await setup(page);
 await page.goto('/#/reports?variant=18');
 await expect(page.getByRole('heading',{name:'Reports & Audit'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'R117H'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Retrieved record totals'})).toContainText('Validation entries');
 await expect(page.getByRole('region',{name:'Retrieved record totals'})).toContainText('Marked unresolved');
 await expect(page.locator('.nfq-audit-event')).toHaveCount(2);
 await expect(page.locator('.nfq-audit-undated-row')).toHaveCount(1);
 await expect(page.getByText('2026-11-01 12:00 UTC')).toBeVisible();
 const filters=page.getByRole('group',{name:'Filter recorded events'});
 await filters.getByRole('button',{name:'Conflicts'}).click();
 await expect(page.locator('.nfq-audit-event')).toHaveCount(1);
 await expect(page.locator('.nfq-audit-undated-row')).toHaveCount(1);
 await filters.getByRole('button',{name:'Validations'}).click();
 await expect(page.locator('.nfq-audit-event')).toHaveCount(1);
 await expect(page.locator('.nfq-audit-undated-row')).toHaveCount(0);
 const download=page.waitForEvent('download');
 await page.getByTestId('nfq-audit-export').click();
 expect((await download).suggestedFilename()).toBe('neumuacFQ-recorded-activity-18.csv');
 await expect(page.getByRole('status').filter({hasText:'metadata was exported'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Evidence sources'})).toHaveAttribute('href',/#\/evidence\?variant=18/);
 expect(methods.length).toBeGreaterThanOrEqual(3);
 expect(methods.every(method=>method==='GET')).toBe(true);
});
test('invalid or inaccessible histories never fabricate timeline, totals or exports',async({page})=>{
 await setup(page,'denied');
 await page.goto('/#/reports?variant=18');
 await expect(page.getByText('The recorded history could not be retrieved in full.')).toBeVisible();
 await expect(page.getByTestId('nfq-audit-export')).toHaveCount(0);
 await expect(page.locator('.nfq-audit-metrics')).toHaveCount(0);
 await page.goto('/#/reports?variant=0');
 await expect(page.getByText('The supplied variant identifier is invalid.')).toBeVisible();
 await expect(page.locator('.nfq-audit-identity')).toHaveCount(0);
});
test('inconsistent per-variant source fails closed; clearing scope removes stale context',async({page})=>{
 await setup(page,'mismatch');
 await page.goto('/#/reports?variant=18');
 await expect(page.getByText('The recorded history could not be retrieved in full.')).toBeVisible();
 await expect(page.locator('.nfq-audit-event')).toHaveCount(0);
 await page.getByRole('button',{name:'Change variant'}).click();
 await expect(page).toHaveURL(/#\/reports$/);
 await expect(page.getByText('Start with a recorded variant.')).toBeVisible();
 await expect(page.locator('.nfq-audit-identity')).toHaveCount(0);
});
test('read-only report is contained and Midnight-accurate on phone and desktop',async({page})=>{
 await setup(page);
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,760,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/reports?variant=18');
  await expect(page.locator('.nfq-audit-chronology')).toBeVisible();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  const picker=await page.locator('.nfq-audit-picker').evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(picker).toBe('rgb(15, 29, 48)');
  const search=page.getByRole('searchbox',{name:'Recorded name or variant ID'});
  const height=await search.evaluate(el=>parseFloat(getComputedStyle(el).height));
  expect(height).toBeGreaterThanOrEqual(40);
  if(width<=760){
   const font=await search.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   expect(font).toBeGreaterThanOrEqual(16);
  }
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
