import {test,expect} from '@playwright/test';

/** E03 editorial acceptance: rendered application behavior and responsive fit.
 * No fake medical records, external API fixtures or color reclassification.
 */
test('editorial launcher remains keyboard operable and contained across viewports',async({page})=>{
 await page.goto('/#/workspace');
 await expect(page.getByRole('heading',{name:'CFTR variant research',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const launcher=page.getByRole('dialog',{name:'Research workspace switcher'});
 await expect(launcher).toBeVisible();
 const bounds=await launcher.boundingBox();
 const viewport=page.viewportSize()!;
 expect(bounds).not.toBeNull();
 expect(bounds!.x).toBeGreaterThanOrEqual(-1);
 expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width+1);
 await expect(launcher.getByRole('searchbox',{name:'Find a research workspace'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(launcher).toHaveCount(0);
});
test('research surfaces maintain viewport containment with the editorial layer',async({page})=>{
 for(const route of ['/#/workspace','/#/variants','/#/genotype','/#/evidence','/#/audit']){
  await page.goto(route);
  await expect(page.locator('.app-frame')).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
test('original theme switching survives editorial layers',async({page})=>{
 await page.goto('/#/workspace');
 const frame=page.locator('.app-frame');
 if(page.viewportSize()!.width<=760){
  await page.getByRole('button',{name:/workspaces/i}).click();
  await page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('button',{name:'Switch to midnight theme'}).click();
 }else{
  await page.getByTestId('nfq-research-theme-switch').click();
 }
 await expect(frame).toHaveAttribute('data-nfq-theme','midnight');
 await page.goto('/#/variants');
 await expect(frame).toHaveAttribute('data-nfq-theme','midnight');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
