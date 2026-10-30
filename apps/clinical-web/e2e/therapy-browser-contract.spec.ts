import {test,expect,type Page,type Locator} from '@playwright/test';

/** LOCAL TEST-ONLY fixtures. Never bundled into clinical src or connected to
 * production. These records exercise the immutable scientific state contract.
 */
const variants:Record<string,Record<string,unknown>>={
 '1':{id:1,legacy_name:'E831X',cftr_class:'I',class_subtype:'exceptional',eti_prediction:'responsive',alyftrek_prediction:'unknown'},
 '19':{id:19,legacy_name:'G542X',cftr_class:'I',class_subtype:'exceptional',eti_prediction:'non_responsive',alyftrek_prediction:'unknown'},
 '35':{id:35,legacy_name:'3120+1G->A',cftr_class:'I',class_subtype:'true',eti_prediction:'non_responsive',alyftrek_prediction:'responsive',alyftrek_evidence_tier:'clinical_trial'}
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
async function setup(page:Page,opts:{failFirstTherapy?:boolean}={}):Promise<void>{
 page.on('requestfailed',r=>{if(r.url().includes('cftr-contract.invalid'))console.error('Contract API request failed:',r.url(),r.failure()?.errorText);});
 let failed=false;const methods:string[]=[];
 return page.route('https://cftr-contract.invalid/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').pop();
  if(request.method()==='OPTIONS'){
   await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,accept'}});return;
  }
  methods.push(request.method());
  if(request.method()!=='GET'){await route.fulfill({status:405,body:'No writes supported'});return;}
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  if(table==='variants'&&opts.failFirstTherapy&&!failed&&
     (url.searchParams.get('select')||'').includes('class_subtype')){
   failed=true;
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
 await expect(panel.locator('.nfq-therapy-context')).toContainText('exceptional');
 await expect(panel.locator('.nfq-therapy-row').nth(0).locator('.nfq-therapy-result')).toHaveText('Responsive');
 await expect(panel.locator('.nfq-therapy-row').nth(1).locator('.nfq-therapy-result')).toHaveText('Unknown');
 await expect(panel.locator('.nfq-therapy-row').nth(4).locator('.nfq-therapy-result')).toHaveText('Genotype rules');
 await panel.getByRole('button',{name:'Details',exact:true}).first().click();
 await expect(panel.getByTestId('eti-recorded-category')).toHaveText('Responsive');
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
 await setup(page,{failFirstTherapy:true});
 await page.goto('/#/variants/1');
 const panel=page.getByTestId('five-therapy-workspace');
 await expect(panel.getByRole('alert')).toContainText('Could not load therapy responses.');
 await expect(panel.locator('.nfq-therapy-row')).toHaveCount(0);
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
