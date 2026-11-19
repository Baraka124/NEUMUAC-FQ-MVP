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
 await expect(dialog.locator('.launcher-options button').last()).toBeFocused();
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


test('research entry exposes real scientific pathways with no synthetic metrics',async({page})=>{
 await page.goto('/#/workspace');
 await expect(page.getByRole('heading',{name:'CFTR variant research',exact:true})).toBeVisible();
 await expect(page.getByRole('searchbox',{name:'Search CFTR variants'})).toBeVisible();
 const pathways=page.getByRole('navigation',{name:'Research pathways'});
 await expect(pathways).toBeVisible();
 await expect(pathways.getByRole('link',{name:/Compare two variants/})).toHaveAttribute('href','#/genotype');
 await expect(pathways.getByRole('link',{name:/Trace the evidence/})).toHaveAttribute('href','#/evidence');
 await expect(pathways.getByRole('link',{name:/Inspect knowledge gaps/})).toHaveAttribute('href','#/intelligence');
 await expect(page.getByRole('link',{name:/Open Class I variant worklist/})).toHaveAttribute('href','#/variants?class=I');
 for(const width of [320,390,768,1024,1366]){
  await page.setViewportSize({width,height:850});
  if(width<=760){
   await expect(pathways).toBeHidden();
   const toggle=page.getByRole('button',{name:'Explore pathways'});
   await expect(toggle).toHaveAttribute('aria-expanded','false');
   await toggle.click();
   await expect(pathways).toBeVisible();
   await expect(page.getByRole('button',{name:'Hide pathways'})).toHaveAttribute('aria-expanded','true');
   await page.getByRole('button',{name:'Hide pathways'}).click();
   await expect(pathways).toBeHidden();
  }else{
   await expect(pathways).toBeVisible();
  }
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
 await pathways.getByRole('link',{name:/Compare two variants/}).click();
 await expect(page.getByRole('heading',{name:'Variant comparison'})).toBeVisible();
 await page.goto('/#/workspace');
 await pathways.getByRole('link',{name:/Trace the evidence/}).click();
 await expect(page.getByRole('heading',{name:'Evidence & provenance'})).toBeVisible();
});


test('Ctrl-K search hands scientific identifiers to the real variant index without fabricated records',async({page})=>{
 test.skip(page.viewportSize()!.width<=760,'Desktop launcher has a dedicated trigger; mobile navigation is separate');
 await page.goto('/#/workspace');
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const dialog=page.getByRole('dialog',{name:'Research workspace switcher'});
 const input=dialog.getByRole('searchbox',{name:'Find a research workspace'});
 await input.fill('c.1584G>A');
 await expect(dialog.getByRole('button',{name:/Search recorded CFTR variants for c\.1584G>A/})).toBeVisible();
 await input.press('Enter');
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.hash.split('?')[1]??'').get('q'))).toBe('c.1584G>A');

 await page.goto('/#/workspace');
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const second=page.getByRole('dialog',{name:'Research workspace switcher'});
 const field=second.getByRole('searchbox',{name:'Find a research workspace'});
 await field.fill('1716G/A');
 await field.press('ArrowDown');
 const action=second.getByRole('button',{name:/Search recorded CFTR variants for 1716G\/A/});
 await expect(action).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(second).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.hash.split('?')[1]??'').get('q'))).toBe('1716G/A');
});
