import {test,expect,type Locator} from '@playwright/test';

// 14H139: visual contracts for the original quiet interaction scale and
// dual-appearance surfaces. These tests use no clinical data or privileged writes.
async function surfaceColor(locator:Locator):Promise<string>{
 return locator.evaluate(el=>getComputedStyle(el).backgroundColor);
}

test('14H139 overview search stays proportionate and opens the live variant workspace',async({page})=>{
 for(const width of [320,390,768,1366,1600]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/workspace');
  const controls=page.locator('.nfq-home-search-controls');
  await expect(controls).toBeVisible();
  const dimensions=await controls.boundingBox();
  expect(dimensions).not.toBeNull();
  expect(dimensions!.width).toBeLessThanOrEqual(542);
  const submit=page.getByRole('button',{name:/Search variants/});
  await expect(submit).toBeVisible();
  const style=await submit.evaluate(el=>{
   const css=getComputedStyle(el);
   return {height:parseFloat(css.height),width:parseFloat(css.width),background:css.backgroundColor};
  });
  expect(style.height).toBeGreaterThanOrEqual(39);
  expect(style.height).toBeLessThanOrEqual(42);
  expect(style.width).toBeLessThan(180);
  // The normal outline is transparent, but Playwright may briefly catch the
  // original blue hover wash (alpha ~.06) after moving the pointer. Both are
  // visually quiet; only opaque/strong fills must be rejected.
  const values=style.background.match(/[0-9.]+/g)?.map(Number)??[];
  expect(values.length,'CSS button background must be computed RGB(A)').toBeGreaterThanOrEqual(3);
  const alpha=values.length===4?values[3]:1;
  const white=values[0]===255&&values[1]===255&&values[2]===255;
  expect(white||alpha<=.12,'Search action must not become a solid filled CTA').toBe(true);
  await page.getByRole('searchbox',{name:'Search CFTR variants'}).fill('R117H');
  await submit.click();
  await expect(page).toHaveURL(/#\/variants(?:\?|\/)/);
  await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toHaveValue('R117H');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('14H139 Midnight preserves named research and account surfaces',async({page})=>{
 await page.addInitScript(()=>{
  window.localStorage.setItem('nfq-research-theme-v1','midnight');
 });
 await page.goto('/#/workspace');
 await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
 await expect.poll(()=>surfaceColor(page.locator('.nfq-home-discovery'))).toBe('rgb(15, 29, 48)');
 await page.goto('/#/variants');
 await page.getByTestId('saved-variants-toggle').click();
 await expect(page.locator('.nfq-saved-panel')).toBeVisible();
 await expect.poll(()=>surfaceColor(page.locator('.nfq-saved-panel'))).toBe('rgb(15, 29, 48)');
 await page.getByRole('button',{name:'Search help and scientific data limitations'}).click();
 await expect(page.locator('.discovery-help')).toBeVisible();
 await expect.poll(()=>surfaceColor(page.locator('.discovery-help'))).toBe('rgb(15, 29, 48)');
 await page.goto('/#/admin');
 const accountAside=page.locator('.research-entry-aside');
 await expect(accountAside).toBeVisible();
 await expect.poll(()=>surfaceColor(accountAside)).toBe('rgb(15, 29, 48)');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('14H139 original PNG assets fill their intended brand slots without replacement',async({page})=>{
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/');
 const publicBrand=page.locator('.nfq-portal-brand img');
 await expect(publicBrand).toBeVisible();
 await expect.poll(()=>publicBrand.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 const publicSize=await publicBrand.evaluate(el=>({
  renderedWidth:el.getBoundingClientRect().width,
  objectFit:getComputedStyle(el).objectFit
 }));
 expect(publicSize.renderedWidth).toBeGreaterThan(200);
 expect(publicSize.objectFit).toBe('contain');
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/workspace');
 const sidebarBrand=page.locator('.sidebar .wordmark-icon img');
 await expect(sidebarBrand).toBeVisible();
 await expect.poll(()=>sidebarBrand.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 const mark=await sidebarBrand.evaluate(el=>({size:el.getBoundingClientRect().width,fit:getComputedStyle(el).objectFit}));
 expect(mark.size).toBeGreaterThan(48);
 expect(mark.fit).toBe('contain');
});


test('14H139 scientific route sweep maintains responsive surfaces in both themes',async({page})=>{
 // Public source-free smoke. It covers the interface while keeping all role-
 // gated actions and live data writes out of the visual verification.
 const routes=[
  {path:'/variants',heading:'Variants',surface:'.record-rail'},
  {path:'/genotype',heading:'Variant comparison',surface:'.genotype-locus'},
  {path:'/evidence',heading:'Evidence & provenance',surface:'.nfq-evidence-heading'},
  {path:'/helios',heading:'Helios',surface:'.helios-panel'},
  {path:'/admin',heading:'Research access',surface:'.research-entry-aside'}
 ];
 for(const width of [320,390,1366]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','midnight']){
   await page.addInitScript(choice=>window.localStorage.setItem('nfq-research-theme-v1',choice),theme);
   for(const route of routes){
    await page.goto('/#'+route.path);
    await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme',theme);
    await expect(page.getByRole('heading',{name:route.heading,exact:true}).first()).toBeVisible();
    const surface=page.locator(route.surface).first();
    await expect(surface).toBeVisible();
    if(theme==='midnight' && route.path!=='/evidence'){
     await expect.poll(()=>surface.evaluate(el=>getComputedStyle(el).backgroundColor))
      .toBe('rgb(15, 29, 48)');
    }
    await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
   }
  }
 }
});
