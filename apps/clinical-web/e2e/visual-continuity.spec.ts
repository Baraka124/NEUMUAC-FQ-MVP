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
  expect(style.background).toMatch(/rgba?\(.*(?:0\)|255, 255, 255)/);
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
