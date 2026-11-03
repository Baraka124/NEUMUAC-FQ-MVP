import {test,expect,type Page,type Locator} from '@playwright/test';

/** LOCAL TEST-ONLY fixtures. Never bundled into clinical src or connected to
 * production. These records exercise the immutable scientific state contract.
 */
const variants:Record<string,Record<string,unknown>>={
 '1':{id:1,legacy_name:'E831X',cftr_class:'I',class_subtype:'exceptional',eti_prediction:'responsive',alyftrek_prediction:'unknown'},
 '19':{id:19,legacy_name:'G542X',cftr_class:'I',class_subtype:'exceptional',eti_prediction:'non_responsive',alyftrek_prediction:'unknown',therapy_responsive_drugs:{eti:true}},
 '35':{id:35,legacy_name:'3120+1G->A',cftr_class:'I',class_subtype:'true',eti_prediction:'non_responsive',alyftrek_prediction:'responsive',alyftrek_evidence_tier:'clinical_trial',therapy_responsive_drugs:{eti:false,alyftrek:true}}
};
async function expectFiveRows(panel:Locator):Promise<void>{
 try{await expect(panel.locator('.nfq-therapy-row')).toHaveCount(5,{timeout:10000});}
 catch(e){console.error('Contract dossier state:',(await panel.innerText()).slice(0,1500));throw e;}
}
const classFields={
 protein_name:null,cdna_name:null,alt_names:[],validation_count:0,
 eti_evidence_level:null,alyftrek_evidence_level:null,
 eti_evidence_tier:null,alyftrek_evidence_tier:null,
 eti_authority_source:null,alyftrek_authority_source:null,
 therapy_responsive:false,cftr2_eti_response:null,last_evidence_update:null,
 data_status:'research'
};
const eu=['Kaftrio (ETI)','Alyftrek (VTD)','Kalydeco (IVA)','Symkevi (TEZ/IVA)']
 .map((drug_name,i)=>({id:i+1,drug_name,eligible_rule:'Recorded EU rule',jurisdiction:'EU',regulator:'EMA',approval_date:null,is_active:true}));
async function setup(page:Page,opts:{failTherapy?:boolean}={}):Promise<void>{
 page.on('requestfailed',r=>{if(r.url().includes('cftr-contract.invalid'))console.error('Contract API request failed:',r.url(),r.failure()?.errorText);});
 const methods:string[]=[];
 return page.route('https://cftr-contract.invalid/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').pop();
  if(request.method()==='OPTIONS'){
   await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,accept'}});return;
  }
  methods.push(request.method());
  if(request.method()!=='GET'){await route.fulfill({status:405,body:'No writes supported'});return;}
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  if(table==='variants'&&opts.failTherapy&&
     (url.searchParams.get('select')||'').includes('class_subtype')){
   await route.fulfill({status:503,headers:{'access-control-allow-origin':'*'},body:'Service unavailable'});return;
  }
  let response:unknown[]=[];
  if(table==='variants'){
   const ids=id?[id]:Object.keys(variants);
   response=ids.filter(x=>Boolean(variants[x])).map(x=>({...classFields,...variants[x]}));
  }else if(table==='drug_jurisdiction_rules')response=eu;
  // Other tables deliberately return an empty recorded source list.
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,accept'},body:JSON.stringify(response)});
 });
}

test('Class I exceptional record keeps its ETI and Alyftrek values in the five-row dossier',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/1');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 if(page.viewportSize()!.width > 760){
  await expect(panel.locator('.nfq-therapy-column-head')).toBeVisible();
 }else{
  await expect(panel.locator('.nfq-therapy-column-head')).toBeHidden();
 }
 await expect(panel.locator('.nfq-therapy-column-head')).toContainText('Recorded result / rule coverage');
 await expect(panel.locator('.nfq-therapy-context')).toContainText('exceptional');
 await expect(panel.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-result')).toHaveText('Responsive');
 await expect(panel.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Unknown');
 await expect(panel.locator('.nfq-therapy-row').nth(4).locator('.nfq-therapy-result')).toHaveText('No variant response');
 await panel.locator('.nfq-therapy-row').nth(4).getByRole('button',{name:'Assessment context'}).click();
 await expect(panel.locator('.nfq-therapy-row').nth(4).getByRole('link',{name:'Open genotype workspace'})).toHaveAttribute('href',/#\/genotype/);
 await panel.getByRole('button',{name:'Source evidence',exact:true}).first().click();
 await expect(panel.getByTestId('eti-recorded-category')).toHaveText('Responsive');
 await expect(panel.getByTestId('eti-recorded-category')).toHaveCount(1);
 await expect(panel.getByRole('region',{name:'ETI evidence details'})).toBeVisible();
 await expect(panel.locator('.nfq-therapy-detail')).toBeFocused();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Class I divergence opens an evidence workflow, not an auto-reclassification',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 await expect(panel.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-result')).toHaveText('Non-responsive');
 await expect(panel.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Responsive');
 await panel.getByRole('button',{name:'Review details'}).click();
 await expect(panel.getByRole('region',{name:'Response review details'})).toContainText('ETI and Alyftrek have different');
 await expect(panel.getByRole('link',{name:'Inspect evidence'})).toHaveAttribute('href',/#\/evidence\?variant=35/);
 await expect(panel.getByRole('button',{name:/approve|reclassify/i})).toHaveCount(0);
});

test('variant therapy errors offer genuine retry and never replace a failed value',async({page})=>{
 const outage={failTherapy:true};
 await setup(page,outage);
 await page.goto('/#/variants/1');
 const panel=page.getByTestId('five-therapy-workspace');
 await expect(panel.getByRole('alert')).toContainText('Could not load therapy responses.');
 await expect(panel.locator('.nfq-therapy-row')).toHaveCount(0);
 outage.failTherapy=false;
 await panel.getByRole('button',{name:'Retry'}).click();
 await expectFiveRows(panel);
 await expect(panel.locator('.nfq-therapy-row').first().locator('.nfq-therapy-result')).toHaveText('Responsive');
});

test('genotype selection reveals five rule outcomes and four EU references, keeping Orkambi gap',async({page})=>{
 await setup(page);
 await page.goto('/#/genotype?a=1&b=35');
 const navigate=page.getByTestId('pair-results-navigation');
 await expect(navigate).toBeVisible();
 await navigate.getByRole('button',{name:'View therapy comparison'}).click();
 await expect(page.getByRole('heading',{name:'Five-modulator research rules'})).toBeFocused();
 const pair=page.getByTestId('pair-five-regimen-research');
 await expect(pair.locator('.pair-drugs-row')).toHaveCount(5);
 await expect(navigate.getByTestId('pair-data-readiness')).toContainText('Five-regimen comparison ready');
 await expect(pair.locator('.pair-drugs-row').nth(1).locator('.pair-drugs-result')).toHaveText('Rule matched');
 await page.getByRole('button',{name:'Edit variants'}).click();
 await expect(page.getByRole('searchbox',{name:'Search variant 1'})).toBeFocused();
 const refs=page.getByRole('region',{name:'Drug references'});
 await refs.getByRole('button',{name:'Explore references'}).click();
 await expect(refs.locator('.drug-register-entry')).toHaveCount(5);
 await refs.locator('.drug-register-entry').last().getByRole('button',{name:'Details'}).click();
 await expect(refs).toContainText('No EU rule in this register');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('pair status remains failed until the actual therapy evidence retry succeeds',async({page})=>{
 const outage={failTherapy:true};
 await setup(page,outage);
 await page.goto('/#/genotype?a=1&b=35');
 const navigation=page.getByTestId('pair-results-navigation');
 await expect(navigation).toBeVisible();
 await expect(navigation.getByTestId('pair-data-readiness')).toContainText('Therapy comparison failed');
 const pair=page.getByTestId('pair-five-regimen-research');
 await expect(pair.locator('.pair-drugs-row')).toHaveCount(0);
 outage.failTherapy=false;
 await pair.getByRole('button',{name:'Retry'}).click();
 await expect(pair.locator('.pair-drugs-row')).toHaveCount(5);
 await expect(navigation.getByTestId('pair-data-readiness')).toContainText('Five-regimen comparison ready');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Alyftrek owns its source inspection even for Class I variant with no linked Alyftrek paper',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35');
 const workspace=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(workspace);
 await expect(workspace.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-result')).toHaveText('Non-responsive');
 await expect(workspace.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Responsive');
 await workspace.locator('.nfq-therapy-row').nth(1).getByRole('button',{name:'Source evidence',exact:true}).click();
 const sources=workspace.getByRole('region',{name:'Alyftrek source evidence'});
 await expect(sources).toBeVisible();
 await expect(sources).toContainText('No linked Alyftrek response findings in this register.');
 await expect(workspace.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-detail')).toHaveCount(0);
 await expect(workspace.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-detail')).toBeFocused();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('G542X keeps ETI non-responsive while its historical boolean discrepancy remains inspectable',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/19');
 const workspace=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(workspace);
 await expect(workspace.locator('.nfq-therapy-row').first().locator('.nfq-therapy-result')).toHaveText('Non-responsive');
 await workspace.locator('.nfq-therapy-row').first().getByRole('button',{name:'Source evidence',exact:true}).click();
 await expect(workspace.getByTestId('therapy-historical-flag-disagreement')).toContainText('historical flag differs');
 await expect(workspace.locator('.nfq-therapy-row').first()).toContainText('Historical drug flag: Yes');
 await expect(workspace.getByTestId('eti-recorded-category')).toHaveText('Non-responsive');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
test('Alyftrek Class I response retains its independent true historical flag without ETI reclassification',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35');
 const workspace=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(workspace);
 await workspace.locator('.nfq-therapy-row').nth(1).getByRole('button',{name:'Source evidence',exact:true}).click();
 await expect(workspace.locator('.nfq-therapy-row').nth(1)).toContainText('Historical drug flag: Yes');
 await expect(workspace.getByTestId('therapy-historical-flag-disagreement')).toHaveCount(0);
 await expect(workspace.locator('.nfq-therapy-row').first().locator('.nfq-therapy-result')).toHaveText('Non-responsive');
});

test('compact phone keeps scientific therapy findings navigable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:690});
 await setup(page);
 await page.goto('/#/variants/35');
 const workspace=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(workspace);
 await expect(workspace.getByRole('navigation',{name:'Therapy research navigation'})).toBeVisible();
 await workspace.getByRole('link',{name:/Genotype rules/}).click();
 await expect(workspace.locator('.nfq-therapy-row').nth(2).getByRole('button',{name:'Assessment context'})).toBeFocused();
 await workspace.locator('.nfq-therapy-row').nth(2).getByRole('button',{name:'Assessment context'}).click();
 await expect(workspace.locator('.nfq-therapy-row').nth(2).getByRole('region',{name:/Kalydeco research details/})).toBeVisible();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 await expect(workspace.locator('.nfq-therapy-row').first().locator('.nfq-therapy-result')).toHaveText('Non-responsive');
 await expect(workspace.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Responsive');
});


test('Dossier section navigation preserves the selected variant route and focuses its target',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/1');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 const dossier=page.getByRole('navigation',{name:'Selected variant sections'});
 await dossier.getByRole('link',{name:'Therapies'}).click();
 await expect(page).toHaveURL(/#\/variants\/1(?:\?|$)/);
 await expect(page.locator('#nfq-variant-therapy')).toBeFocused();
 await dossier.getByRole('link',{name:'Identity'}).click();
 await expect(page).toHaveURL(/#\/variants\/1(?:\?|$)/);
 await expect(page.locator('#nfq-variant-identity')).toBeFocused();
});


test('Dossier hierarchy presents identity, modulator evidence and expanded provenance in order',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/1');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 await expect(page.locator('#nfq-variant-identity #selected-title')).toBeVisible();
 await expect(panel.getByRole('heading',{name:'Modulator research'})).toBeVisible();
 await expect(page.locator('#nfq-variant-science .nfq-details-trigger')).toContainText('Evidence & provenance');
 await expect(page.locator('.nfq-dossier-overline,.nfq-dossier-identity-heading,.nfq-dossier-science-intro')).toHaveCount(0);
 const navigation=page.getByRole('navigation',{name:'Selected variant sections'});
 await navigation.getByRole('link',{name:'Scientific detail'}).click();
 await expect(page.locator('#nfq-variant-science')).toBeFocused();
 await expect(page.locator('#nfq-secondary-science')).toBeVisible();
 await expect(page).toHaveURL(/#\/variants\/1(?:\?|$)/);
});


test('Therapy coverage groups present two recorded responses and three genotype rules without inferred values',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 const recorded=panel.getByRole('region',{name:'Recorded variant responses'});
 const rules=panel.getByRole('region',{name:'Genotype research rules'});
 await expect(recorded.locator('.nfq-therapy-row')).toHaveCount(2);
 await expect(rules.locator('.nfq-therapy-row')).toHaveCount(3);
 await expect(recorded.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-result')).toHaveText('Non-responsive');
 await expect(recorded.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Responsive');
 for(const row of await rules.locator('.nfq-therapy-row').all()){
  await expect(row.locator('.nfq-therapy-result')).toHaveText('No variant response');
 }
 await panel.getByRole('navigation',{name:'Therapy research navigation'}).getByRole('link',{name:/Genotype rules/}).click();
 await expect(rules.getByRole('button',{name:'Assessment context'}).first()).toBeFocused();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});


test('Evidence register separates source identity, recorded values and link consistency without inventing scientific verification',async({page})=>{
 await setup(page);
 const fixture={
  id:901,variant_id:35,title:'Fixture CFTR publication with recorded metadata',
  url:'https://doi.org/10.1000/fixture-901',source:'Fixture catalog',type:'Journal article',
  category:'CFTR research',journal:'Fixture Research Journal',year:2024,pmid:null,
  doi:'10.1000/different-identifier',quality_score:2,source_weight:0.3,citation_count:4
 };
 await page.route('https://cftr-contract.invalid/rest/v1/evidence_links*',async route=>{
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify([fixture])});
 });
 await page.goto('/#/evidence?variant=35');
 const register=page.getByRole('region',{name:'Recorded citations'});
 const record=register.locator('.evidence-row');
 await expect(record).toHaveCount(1);
 await expect(record.getByRole('heading',{name:fixture.title})).toBeVisible();
 await expect(record.getByRole('region',{name:'Recorded citation metadata'})).toHaveCount(0);
 await record.getByRole('button',{name:fixture.title}).click();
 await expect(record.getByRole('region',{name:'Recorded citation metadata'})).toContainText('Fixture Research Journal');
 await expect(record.getByRole('region',{name:'Recorded research metadata'})).toContainText('Recorded quality score');
 await expect(record.locator('[data-link-consistency="mismatch"]')).toContainText('Recorded DOI differs from linked DOI');
 await expect(record).toContainText('not an independent appraisal');
 await expect(record.getByRole('link',{name:/Open original source/})).toHaveAttribute('href',fixture.url);
 await expect(record.getByRole('link',{name:/Open variant record #35/})).toHaveAttribute('href',/#\/variants\/35/);
 await expect(record.getByRole('region',{name:'Publication indexing'})).toContainText('No supported recorded PMID');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 await record.getByRole('button',{name:fixture.title}).click();
 await expect(record.getByRole('region',{name:'Recorded citation metadata'})).toHaveCount(0);
});


test('Variant evidence round trip restores the exact record, search terms and class filters',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35?q=3120&class=I&sort=name-desc');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 await panel.locator('.nfq-therapy-row').first().getByRole('button',{name:'Source evidence'}).click();
 await panel.getByRole('link',{name:'Evidence & curation'}).first().click();
 await expect(page.getByTestId('evidence-context-return')).toContainText('Return to variant dossier');
 await expect(page).toHaveURL(/#\/evidence\?/);
 await page.getByTestId('evidence-context-return').click();
 await expect(page).toHaveURL(/#\/variants\/35\?/);
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 const routeQuery=await page.evaluate(()=>Object.fromEntries(new URLSearchParams(location.hash.split('?')[1])));
 expect(routeQuery.class).toBe('I');
 expect(routeQuery.sort).toBe('name-desc');
 await expect(page.getByTestId('five-therapy-workspace')).toBeVisible();
 await page.getByTestId('variant-context-return').click();
 await expect(page).toHaveURL(/#\/variants\?/);
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 const worklistQuery=await page.evaluate(()=>Object.fromEntries(new URLSearchParams(location.hash.split('?')[1])));
 expect(worklistQuery.class).toBe('I');
 expect(worklistQuery.sort).toBe('name-desc');
});

test('Variant, comparison and evidence preserve a bounded navigation trail through both return hops',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35?q=3120&class=I');
 const panel=page.getByTestId('five-therapy-workspace');
 await expectFiveRows(panel);
 await panel.locator('.nfq-therapy-row').nth(2).getByRole('button',{name:'Assessment context'}).click();
 await panel.getByRole('link',{name:'Open genotype workspace'}).click();
 await expect(page).toHaveURL(/#\/genotype\?/);
 await expect(page.getByTestId('comparison-context-return')).toContainText('Return to variant dossier');
 await expect(page.locator('#genotype-search-0')).toHaveValue(/3120/);
 await page.getByRole('region',{name:'Variant 1'}).getByRole('link',{name:/Browse recorded evidence/}).click();
 await expect(page.getByTestId('evidence-context-return')).toContainText('Return to variant comparison');
 await page.getByTestId('evidence-context-return').click();
 await expect(page).toHaveURL(/#\/genotype\?/);
 await expect(page.locator('#genotype-search-0')).toHaveValue(/3120/);
 await page.getByTestId('comparison-context-return').click();
 await expect(page).toHaveURL(/#\/variants\/35\?/);
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
});

test('Comparison edits retain only validated variant origin; untrusted return URLs never render',async({page})=>{
 await setup(page);
 const origin='/variants/35?q=3120&class=I';
 await page.goto('/#/genotype?a=35&b=19&from='+encodeURIComponent(origin));
 await expect(page.getByTestId('comparison-context-return')).toBeVisible();
 await expect(page.getByRole('region',{name:'Variant 2'}).getByRole('button',{name:'Clear'})).toBeVisible();
 await page.getByRole('region',{name:'Variant 2'}).getByRole('button',{name:'Clear'}).click();
 const from=await page.evaluate(()=>new URLSearchParams(location.hash.slice(location.hash.indexOf('?')+1)).get('from'));
 expect(from).toBe(origin);
 await page.goto('/#/genotype?a=35&from='+encodeURIComponent('//untrusted.example/path'));
 await expect(page.getByTestId('comparison-context-return')).toHaveCount(0);
 await page.goto('/#/evidence?variant=35&from='+encodeURIComponent('https://untrusted.example'));
 await expect(page.getByTestId('evidence-context-return')).toHaveCount(0);
});


async function openGlobalWorkspace(page:Page,name:string):Promise<void>{
 if(page.viewportSize()!.width<=760){
  await page.getByRole('button',{name:'Workspaces',exact:true}).click();
  await page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('link',{name,exact:true}).click();
 }else{
  await page.getByRole('navigation',{name:'Workspaces',exact:true}).getByRole('link',{name,exact:true}).click();
 }
}

test('Main navigation stays connected to the active CFTR variant through evidence, comparison and coverage',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35?q=3120&class=I');
 await expectFiveRows(page.getByTestId('five-therapy-workspace'));
 await openGlobalWorkspace(page,'Evidence & Curation');
 await expect(page).toHaveURL(/#\/evidence\?variant=35/);
 await expect(page.getByTestId('evidence-context-return')).toContainText('Return to variant dossier');
 await page.getByTestId('evidence-context-return').click();
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 await openGlobalWorkspace(page,'Genotype');
 await expect(page).toHaveURL(/#\/genotype\?a=35/);
 await expect(page.locator('#genotype-search-0')).toHaveValue(/3120/);
 await openGlobalWorkspace(page,'Evidence & Curation');
 await expect(page.getByTestId('evidence-context-return')).toContainText('Return to variant comparison');
 await page.getByTestId('evidence-context-return').click();
 await expect(page.locator('#genotype-search-0')).toHaveValue(/3120/);
 await page.getByTestId('comparison-context-return').click();
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 await openGlobalWorkspace(page,'Research coverage');
 await expect(page.getByTestId('coverage-context-return')).toContainText('Return to variant dossier');
 await page.getByTestId('coverage-context-return').click();
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 await openGlobalWorkspace(page,'Variants');
 await expect(page).toHaveURL(/#\/variants\?/);
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 const filters=await page.evaluate(()=>Object.fromEntries(new URLSearchParams(location.hash.slice(location.hash.indexOf('?')+1))));
 expect(filters.class).toBe('I');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Workspace switcher opens variant-scoped evidence and allows return to the exact dossier',async({page})=>{
 await setup(page);
 await page.goto('/#/variants/35?q=3120&class=I&sort=name-desc');
 await expectFiveRows(page.getByTestId('five-therapy-workspace'));
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const launcher=page.getByRole('dialog',{name:'Research workspace switcher'});
 await launcher.getByRole('button',{name:/Evidence & Curation/}).click();
 await expect(page.getByTestId('evidence-context-return')).toBeVisible();
 await page.getByTestId('evidence-context-return').click();
 await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('3120');
 const filters=await page.evaluate(()=>Object.fromEntries(new URLSearchParams(location.hash.slice(location.hash.indexOf('?')+1))));
 expect(filters.class).toBe('I');
 expect(filters.sort).toBe('name-desc');
});


test('14H98 selected variant workbench uses first viewport instead of stacking empty top bands',async({page})=>{
 await setup(page);
 for(const width of [1366,1580]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/variants/35');
  const panel=page.getByTestId('five-therapy-workspace');
  await expectFiveRows(panel);
  const nav=page.locator('.nfq-dossier-navigation');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('navigation',{name:'Research return path'})).toBeVisible();
  await expect(nav.getByRole('navigation',{name:'Selected variant sections'})).toBeVisible();
  const geometry=await page.evaluate(()=>{
   const rect=(selector:string)=>document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
   const header=rect('.institution-header'),rail=rect('.record-rail'),toolbar=rect('.nfq-dossier-navigation');
   const dossier=rect('.record-overview'),identity=rect('.nfq-identity-title h2');
   return {
    mainGap:rail.top-header.bottom,
    navLag:dossier.top-rail.top,
    betweenToolbarAndDossier:dossier.top-toolbar.bottom,
    titleBottom:identity.bottom
   };
  });
  expect(geometry.mainGap).toBeLessThan(112);
  expect(geometry.navLag).toBeLessThan(130);
  expect(geometry.betweenToolbarAndDossier).toBeLessThan(24);
  expect(geometry.titleBottom).toBeLessThan(560);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
 await page.setViewportSize({width:390,height:850});
 await page.goto('/#/variants/35');
 await expectFiveRows(page.getByTestId('five-therapy-workspace'));
 const nav=page.locator('.nfq-dossier-navigation');
 await expect(nav.getByRole('link',{name:'Scientific detail'})).toBeVisible();
 await nav.getByRole('link',{name:'Therapies'}).click();
 await expect(page.locator('#nfq-variant-therapy')).toBeFocused();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});


test('14H99 dossier shows scientific data without numbering, duplicate headings or explanatory paragraphs',async({page})=>{
 await setup(page);
 for(const width of [390,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants/35');
  const panel=page.getByTestId('five-therapy-workspace');
  await expectFiveRows(panel);
  await expect(page.locator('#selected-title')).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Modulator research'})).toHaveCount(1);
  await expect(page.locator('.nfq-therapy-kicker,.nfq-therapy-summary,.nfq-dossier-overline,.nfq-dossier-section-intro')).toHaveCount(0);
  await expect(page.locator('.nfq-dossier-identity-heading')).toHaveCount(0);
  await expect(page.locator('.nfq-dossier-identity>div')).toHaveCount(4);
  const borderStyles=await page.locator('.nfq-dossier-identity').evaluate(element=>{
   const own=getComputedStyle(element);
   const field=getComputedStyle(element.querySelector('div')!);
   return {top:own.borderTopWidth,bottom:field.borderBottomWidth};
  });
  expect(borderStyles.top).toBe('0px');
  expect(borderStyles.bottom).toBe('0px');
  const identityHelp=page.locator('.nfq-identity-title .nfq-context-help');
  await expect(identityHelp.locator('.nfq-context-help-panel')).toBeHidden();
  await identityHelp.locator('summary').click();
  await expect(identityHelp.locator('.nfq-context-help-panel')).toContainText('recorded');
  await expect(identityHelp.locator('.nfq-context-help-panel')).toBeVisible();
  await identityHelp.locator('summary').click();
  const modulatorHelp=panel.locator('.nfq-therapy-heading .nfq-context-help');
  await modulatorHelp.locator('summary').click();
  await expect(modulatorHelp.locator('.nfq-context-help-panel')).toContainText('not treatment recommendations');
  await modulatorHelp.locator('summary').click();
  const scientific=page.locator('#nfq-variant-science');
  await expect(scientific.locator('.nfq-details-trigger')).toContainText('Evidence & provenance');
  await scientific.locator('.nfq-details-trigger').click();
  await expect(page.locator('#nfq-secondary-science')).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
