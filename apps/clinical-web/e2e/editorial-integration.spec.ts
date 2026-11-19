import {test,expect} from '@playwright/test';

/** E03 editorial acceptance: rendered application behavior and responsive fit.
 * No fake medical records, external API fixtures or color reclassification.
 */
test('editorial launcher remains keyboard operable and contained across viewports',async({page})=>{
 test.skip(page.viewportSize()!.width<=760,'Mobile workspace navigation is tested separately');
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
 for(const route of ['/#/workspace','/#/variants','/#/genotype','/#/evidence','/#/reports']){
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


test('editorial switcher traps Tab, navigates options and restores trigger focus',async({page})=>{
 test.skip(page.viewportSize()!.width<=760,'Mobile uses the dedicated workspace navigation');
 await page.goto('/#/workspace');
 const trigger=page.getByRole('button',{name:'Open workspace switcher'});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Research workspace switcher'});
 const input=dialog.getByRole('searchbox',{name:'Find a research workspace'});
 await expect(input).toBeFocused();
 await input.press('Shift+Tab');
 await expect(dialog.getByRole('button',{name:'Close workspace switcher'})).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(input).toBeFocused();
 await page.keyboard.press('ArrowDown');
 const options=dialog.locator('.launcher-options button');
 await expect(options.first()).toBeFocused();
 await page.keyboard.press('ArrowDown');
 await expect(options.nth(1)).toBeFocused();
 await page.keyboard.press('ArrowUp');
 await expect(options.first()).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(trigger).toBeFocused();
});
