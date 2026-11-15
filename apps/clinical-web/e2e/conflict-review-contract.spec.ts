import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Synthetic records exist only in browser tests, not source/UI.
type Mode='complete'|'missing'|'denied'|'wrong-variant'|'over-limit';
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS',
 'access-control-allow-headers':'apikey,authorization,content-type,accept'};
async function setup(page:Page,mode:Mode='complete'){
 const methods:string[]=[];
 await page.route('https://cftr-contract.invalid/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  const table=url.pathname.split('/').pop();
  methods.push(request.method());
  if(request.method()==='OPTIONS'){
   await route.fulfill({status:204,headers:cors});return;
  }
  if(request.method()!=='GET'){
   await route.fulfill({status:405,headers:cors,body:'Not permitted'});return;
  }
  if(table==='evidence_links'&&mode==='denied'){
   await route.fulfill({status:403,headers:cors,body:'Access denied'});return;
  }
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  const variant=url.searchParams.get('variant_id')?.replace(/^eq\./,'');
  let rows:unknown[]=[];
  if(table==='variants'&&id==='18'){
   rows=[{id:18,legacy_name:'R117H',protein_name:'p.Arg117His',
    cdna_name:null,alt_names:[],cftr_class:'IV',class_subtype:null,
    eti_prediction:'unknown',alyftrek_prediction:'unknown',validation_count:1}];
  }
  if(table==='variants'&&id==='19'){
   rows=[{id:19,legacy_name:'G551D',protein_name:'p.Gly551Asp',
    cdna_name:null,alt_names:[],cftr_class:'III',class_subtype:null,
    eti_prediction:'unknown',alyftrek_prediction:'unknown',validation_count:0}];
  }
  if(table==='validation_history'&&variant==='18'){
   rows=[{id:2,variant_id:18,action:'RECORDED',
    created_at:'2026-11-01T12:00:00Z',confidence_level:null,snapshot_cftr_class:'IV'}];
  }
  if(table==='contradictions'&&variant==='18'){
   rows=[
    {id:9,variant_id:18,field:'recorded_class',severity:'HIGH',
     resolved:false,detected_at:'2026-09-01T12:00:00Z',resolved_at:null},
    {id:10,variant_id:18,field:'older_citation',severity:'LOW',
     resolved:true,detected_at:null,resolved_at:null}
   ];
  }
  if(table==='evidence_links'&&variant==='18'&&mode!=='missing'){
   const row={id:3,variant_id:mode==='wrong-variant'?19:18,
    title:'Recorded PubMed source',url:'https://pubmed.ncbi.nlm.nih.gov/1234/',
    source:'PubMed',type:'publication',category:'functional',
    journal:'Journal',year:2026,pmid:'1234',doi:null,
    quality_score:null,source_weight:null,citation_count:null};
   rows=mode==='over-limit'?Array.from({length:201},(_,i)=>({...row,id:i+1})): [row];
  }
  await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(rows)});
 });
 return methods;
}

test('14H147 unresolved variant is review-prepared only after complete linked source retrieval',async({page})=>{
 const methods=await setup(page);
 await page.goto('/#/reports?variant=18');
 await expect(page.getByRole('heading',{name:'R117H'})).toBeVisible();
 const panel=page.getByTestId('nfq-unresolved-review');
 await expect(panel).toBeVisible();
 await expect(panel.getByText('recorded_class',{exact:true})).toBeVisible();
 await expect(panel.getByText('older_citation',{exact:true})).toHaveCount(0);
 await expect(page.getByTestId('nfq-download-review')).toHaveCount(0);
 await page.getByTestId('nfq-prepare-review').click();
 await expect(panel.getByRole('status').filter({hasText:'1 linked reference'})).toBeVisible();
 const pending=page.waitForEvent('download');
 await page.getByTestId('nfq-download-review').click();
 const download=await pending;
 expect(download.suggestedFilename()).toBe('neumuacFQ-unresolved-review-18.md');
 const saved=await readFile(await download.path(),'utf8');
 expect(saved).toContain('Unresolved conflict records: 1');
 expect(saved).toContain('Conflict #9');
 expect(saved).not.toContain('Conflict #10');
 expect(saved).toContain('Record #3: Recorded PubMed source');
 expect(saved).toContain('not been independently established');
 expect(saved).toContain('no approval or resolution');
 expect(saved).not.toContain('patient');
 expect(methods.every(x=>x==='GET')).toBe(true);
 expect(methods.length).toBeGreaterThanOrEqual(4);
 await page.getByRole('link',{name:/Inspect evidence register/}).click();
 await expect(page).toHaveURL(/#\/evidence\?variant=18/);
 await expect(page.getByRole('link',{name:'Recorded history'})).toBeVisible();
});

test('14H147 source denial, wrong-variant references or incomplete page cannot generate a review packet',async({page})=>{
 for(const mode of ['denied','wrong-variant','over-limit'] as const){
  await page.unrouteAll();
  await setup(page,mode);
  await page.goto('/#/reports?variant=18');
  await expect(page.getByTestId('nfq-prepare-review')).toBeVisible();
  await page.getByTestId('nfq-prepare-review').click();
  await expect(page.getByTestId('nfq-unresolved-review').getByRole('alert')).toContainText('complete variant-linked reference register was unavailable');
  await expect(page.getByTestId('nfq-download-review')).toHaveCount(0);
 }
});

test('14H147 a genuinely empty linked source set is distinguished from failed retrieval',async({page})=>{
 await setup(page,'missing');
 await page.goto('/#/reports?variant=18');
 await page.getByTestId('nfq-prepare-review').click();
 await expect(page.getByTestId('nfq-unresolved-review').getByRole('status')).toContainText('0 linked references');
 await expect(page.getByTestId('nfq-download-review')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.getByTestId('nfq-download-review').click();
 const content=await readFile(await (await download).path(),'utf8');
 expect(content).toContain('Variant-linked references (0)');
});

test('14H147 scope switching discards prepared source context and removes old export',async({page})=>{
 await setup(page);
 await page.goto('/#/reports?variant=18');
 await page.getByTestId('nfq-prepare-review').click();
 await expect(page.getByTestId('nfq-download-review')).toBeVisible();
 await page.goto('/#/reports?variant=19');
 await expect(page.getByRole('heading',{name:'G551D'})).toBeVisible();
 await expect(page.getByTestId('nfq-unresolved-review')).toHaveCount(0);
 await expect(page.getByTestId('nfq-download-review')).toHaveCount(0);
});

test('14H147 Midnight source-preparation surface and scoped links remain compact across phone widths',async({page})=>{
 await setup(page);
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,760,1366]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/reports?variant=18');
  const review=page.getByTestId('nfq-unresolved-review');
  await expect(review).toBeVisible();
  expect(await review.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(15, 29, 48)');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});


test('14H148 creates only explicitly authored, source-located, unverified working links with no API mutations',async({page})=>{
 const methods=await setup(page);
 await page.goto('/#/reports?variant=18');
 await expect(page.getByTestId('nfq-traceability')).toHaveCount(0);
 await page.getByTestId('nfq-prepare-review').click();
 const trace=page.getByTestId('nfq-traceability');
 await expect(trace).toBeVisible();
 await trace.locator('summary').click();
 await expect(page.getByTestId('nfq-trace-progress')).toContainText('0 local links');
 await expect(page.getByTestId('nfq-trace-download')).toBeDisabled();
 await page.getByTestId('nfq-trace-conflict').selectOption('9');
 await page.getByTestId('nfq-trace-reference').selectOption('3');
 await expect(trace.getByRole('link',{name:/Inspect original source/})).toHaveAttribute('href','https://pubmed.ncbi.nlm.nih.gov/1234/');
 await page.getByTestId('nfq-trace-relation').selectOption('possible-disagreement');
 await page.getByTestId('nfq-trace-question').fill('Does the referenced functional finding contradict the recorded research class?');
 await page.getByTestId('nfq-trace-locator').fill('Results · Table 2');
 await page.getByTestId('nfq-trace-interpretation').fill('Check the exact functional dataset before interpreting the apparent classification discrepancy.');
 await page.getByTestId('nfq-trace-add').click();
 await expect(page.getByTestId('nfq-trace-progress')).toContainText('1 local link');
 await expect(page.getByTestId('nfq-trace-download')).toBeEnabled();
 const download=page.waitForEvent('download');
 await page.getByTestId('nfq-trace-download').click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('neumuacFQ-evidence-traceability-18.md');
 const content=await readFile(await file.path(),'utf8');
 expect(content).toContain('conflict #9 / reference #3');
 expect(content).toContain('Possible disagreement');
 expect(content).toContain('Results · Table 2');
 expect(content).toContain('UNSUBMITTED PROVISIONAL RESEARCH NOTES');
 expect(content).toContain('No database-stored conflict-to-reference relationship is established');
 expect(content).not.toContain('conflict #10 /');
 expect(methods.every(method=>method==='GET')).toBe(true);
 await trace.getByRole('button',{name:'Remove working link for conflict 9 and reference 3'}).click();
 await expect(page.getByTestId('nfq-trace-download')).toBeDisabled();
});

test('14H148 fails closed for incomplete sources and clears manual associations when scope changes',async({page})=>{
 await setup(page,'complete');
 await page.goto('/#/reports?variant=18');
 await page.getByTestId('nfq-prepare-review').click();
 await page.getByTestId('nfq-traceability').locator('summary').click();
 await page.getByTestId('nfq-trace-conflict').selectOption('9');
 await page.getByTestId('nfq-trace-reference').selectOption('3');
 await page.getByTestId('nfq-trace-question').fill('Does this original reference address the recorded class precisely?');
 await page.getByTestId('nfq-trace-locator').fill('Abstract');
 await page.getByTestId('nfq-trace-interpretation').fill('Read the source and independently verify the described functional method.');
 await page.getByTestId('nfq-trace-add').click();
 await expect(page.getByTestId('nfq-trace-progress')).toContainText('1 local link');
 await page.goto('/#/reports?variant=19');
 await expect(page.getByTestId('nfq-traceability')).toHaveCount(0);
 await page.goto('/#/reports?variant=18');
 await page.getByTestId('nfq-prepare-review').click();
 await page.getByTestId('nfq-traceability').locator('summary').click();
 await expect(page.getByTestId('nfq-trace-progress')).toContainText('0 local links');
 for(const mode of ['denied','wrong-variant','over-limit','missing'] as const){
  await page.unrouteAll();
  await setup(page,mode);
  await page.goto('/#/reports?variant=18');
  await page.getByTestId('nfq-prepare-review').click();
  if(mode==='missing'){
   await expect(page.getByTestId('nfq-unresolved-review').getByRole('status')).toContainText('0 linked references');
  }else{
   await expect(page.getByTestId('nfq-unresolved-review').getByRole('alert')).toContainText('complete variant-linked reference register was unavailable');
  }
  await expect(page.getByTestId('nfq-traceability')).toHaveCount(0);
 }
});

test('14H148 expanded traceability controls retain the original Midnight and mobile containment',async({page})=>{
 await setup(page);
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,760,1366]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/reports?variant=18');
  await page.getByTestId('nfq-prepare-review').click();
  const trace=page.getByTestId('nfq-traceability');
  await expect(trace).toBeVisible();
  await trace.locator('summary').click();
  expect(await trace.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(17, 31, 51)');
  const input=page.getByTestId('nfq-trace-locator');
  const color=await input.evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(color).toBe('rgb(17, 31, 51)');
  if(width<=760){
   const fontSize=await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   expect(fontSize).toBeGreaterThanOrEqual(16);
  }
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
