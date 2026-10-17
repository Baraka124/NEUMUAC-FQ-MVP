import {test,expect} from '@playwright/test';

/**
 * Opt-in acceptance against the DEPLOYED, public, read-only research catalog.
 * Not part of routine fixture-free CI. Never intercepts or fabricates records.
 * Run with:
 *   NFQ_LIVE_ACCEPTANCE=1 NFQ_LIVE_BASE_URL=https://fq.neumact.org npm run test:e2e:live
 * Tests must not authenticate or issue mutations.
 */
test.skip(process.env.NFQ_LIVE_ACCEPTANCE!=='1','Requires explicit opt-in for live public records');
const liveUrl=process.env.NFQ_LIVE_BASE_URL || 'https://fq.neumact.org';
test.use({baseURL:liveUrl,trace:'retain-on-failure',screenshot:'only-on-failure'});
test('record 1001+11C/T opens from exact search and stays traceable across workspaces',async({page},testInfo)=>{
 test.setTimeout(90000);
 const responses:{path:string;status:number}[]=[];
 page.on('response',response=>{
  const u=new URL(response.url());
  if(u.pathname.startsWith('/rest/v1/'))responses.push({path:u.pathname,status:response.status()});
 });
 await page.goto('/#/variants');
 const search=page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'});
 await expect(search).toBeVisible();
 await search.fill('1001+11C/T');
 const match=page.getByRole('button',{name:/1001\+11C\/T/i}).first();
 await expect(match).toBeVisible({timeout:20000});
 await expect(page.locator('.record-list .record-selected')).toBeVisible({timeout:20000});
 await expect(page.locator('#selected-title')).toHaveText('1001+11C/T',{timeout:20000});
 await expect(page.getByText('Record unavailable',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry full record'})).toHaveCount(0);
 await expect(page.locator('.dossier-science')).toBeVisible();
 const variantId=new URL(page.url()).hash.match(/\/variants\/(\d+)/)?.[1];
 expect(variantId,'An exact match must lead to a recorded dossier ID').toBeTruthy();
 await testInfo.attach('read-only-request-statuses',{body:JSON.stringify(responses,null,2),contentType:'application/json'});
 await page.screenshot({path:testInfo.outputPath('live-variant-dossier.png'),fullPage:true});
 await page.getByRole('button',{name:/Show additional details/i}).click();
 await expect(page.getByRole('region',{name:'Scientific references'})).toBeVisible();
 await page.getByRole('link',{name:/Browse the evidence register/i}).click();
 await expect(page).toHaveURL(new RegExp('variant='+variantId));
 await expect(page.getByRole('heading',{name:'Evidence & provenance'})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 const evidencePages=page.getByRole('navigation',{name:'Evidence pages'});
 const previous=evidencePages.getByRole('button',{name:'Previous'});
 const next=evidencePages.getByRole('button',{name:'Next'});
 await expect(evidencePages).toBeVisible();
 await expect(previous).toBeDisabled();
 await expect(evidencePages).toContainText('Page 1');
 // Only advance when actual recorded evidence supplies a second page.
 if(await next.isEnabled()){
  await next.click();
  await expect(evidencePages).toContainText('Page 2');
  await expect(previous).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await previous.click();
  await expect(evidencePages).toContainText('Page 1');
 }
 await expect(page.getByRole('link',{name:'Return to variant dossier'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('live-scoped-evidence.png'),fullPage:true});
 await page.getByRole('link',{name:'Return to variant dossier'}).click();
 await expect(page.locator('#selected-title')).toHaveText('1001+11C/T');
 await page.getByRole('button',{name:/Show additional details/i}).click();
 await page.getByRole('link',{name:/Inspect documentation coverage/i}).click();
 await expect(page).toHaveURL(new RegExp('variant='+variantId));
 await expect(page.getByRole('heading',{name:'Research coverage'})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Return to variant dossier'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('live-scoped-coverage.png'),fullPage:true});
 await page.getByRole('link',{name:'Return to variant dossier'}).click();
 await expect(page.locator('#selected-title')).toHaveText('1001+11C/T');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
