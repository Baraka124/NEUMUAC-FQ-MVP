import {test,expect} from '@playwright/test';

/** Fixture-free shell acceptance. Never invent clinical history for browser smoke. */
test('14H145 Reports & Audit is a real reachable workspace, not a planned placeholder',async({page})=>{
 await page.goto('/#/reports');
 await expect(page.getByRole('heading',{name:'Reports & Audit'})).toBeVisible();
 await expect(page.getByRole('searchbox',{name:'Recorded name or variant ID'})).toBeVisible();
 await expect(page.getByText('Start with a recorded variant.')).toBeVisible();
 await expect(page.getByText('Implementation pending')).toHaveCount(0);
 if((page.viewportSize()?.width??1366)<=760){
  await page.getByRole('button',{name:'Workspaces',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('link',{name:'Reports & Audit'})).toBeVisible();
 }else{
  await expect(page.getByRole('navigation',{name:'Workspaces'}).getByRole('link',{name:'Reports & Audit'})).toBeVisible();
 }
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('14H145 scoped report opening is deep-linkable, calm and mobile contained',async({page})=>{
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/reports?variant=18');
  await expect(page.getByRole('heading',{name:'Reports & Audit'})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Recorded name or variant ID'})).toHaveValue('18');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  await expect(page.locator('.nfq-audit-picker')).toBeVisible();
  const box=await page.locator('.nfq-audit-search-row').boundingBox();
  expect(box).not.toBeNull();expect(box!.width).toBeLessThanOrEqual(512);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
