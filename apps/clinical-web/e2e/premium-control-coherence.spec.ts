import {test,expect,type Page} from '@playwright/test';

/** 14H153: visual/interaction acceptance; no live source writes or synthetic
 * production data. The search UI renders even without a catalog connection.
 */
async function setTheme(page:Page,mode:'light'|'midnight'):Promise<void>{
 // The desktop theme button is intentionally hidden on phones. Exercise the
 // same persisted research preference that both responsive controls manage,
 // without accumulating multiple unordered addInitScript handlers.
 await page.goto('/#/workspace');
 await page.evaluate(value=>localStorage.setItem('nfq-research-theme-v1',value),mode);
 await page.reload();
 await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme',mode);
}
async function noHorizontalOverflow(page:Page):Promise<void>{
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
}

test('14H153 single search shell, visible therapy labels and compact guided live filters',async({page})=>{
 for(const mode of ['light','midnight'] as const){
  await setTheme(page,mode);
  await page.goto('/#/variants');
  const shell=page.locator('.variant-page .discovery-input');
  const search=page.locator('.variant-page input#search');
  await expect(shell).toBeVisible();
  await search.focus();
  const computed=await page.evaluate(()=>{
   const input=document.querySelector<HTMLElement>('.variant-page input#search')!;
   const outer=document.querySelector<HTMLElement>('.variant-page .discovery-input')!;
   const inner=getComputedStyle(input),wrapper=getComputedStyle(outer);
   return {inputBorder:inner.borderTopWidth,inputOutline:inner.outlineStyle,
    outerBorder:wrapper.borderTopWidth,outerShadow:wrapper.boxShadow,
    inputHeight:input.getBoundingClientRect().height,outerHeight:outer.getBoundingClientRect().height};
  });
  expect(computed.inputBorder).toBe('0px');
  expect(computed.inputOutline).toBe('none');
  expect(computed.outerBorder).not.toBe('0px');
  expect(computed.outerHeight).toBeLessThanOrEqual(47);
  expect(computed.outerShadow).not.toBe('none');
  const toggle=page.getByRole('button',{name:/Filters/});
  await toggle.click();
  const panel=page.getByTestId('nfq-guided-filters');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Refine results'})).toBeFocused();
  await expect(panel.getByRole('heading',{name:'Biological context'})).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Recorded response'})).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Find & organize'})).toBeVisible();
  await expect(panel.getByTestId('nfq-filter-count')).toHaveText('All default preferences');
  await panel.locator('#class-filter').selectOption('I');
  await expect(panel.getByTestId('nfq-filter-count')).toHaveText('1 preferences changed');
  await panel.getByRole('button',{name:'Reset preferences'}).click();
  await expect(panel.locator('#class-filter')).toHaveValue('all');
  await panel.getByRole('button',{name:'Done'}).click();
  await expect(panel).toHaveCount(0);
  await noHorizontalOverflow(page);
 }
});

test('14H161 filters never cover variant search, batch controls or the first result at any breakpoint',async({page})=>{
 for(const [mode,width] of [['light',320],['midnight',390],['light',768],['midnight',1024],['light',1366]] as const){
  await page.setViewportSize({width,height:844});
  await setTheme(page,mode);
  await page.goto('/#/variants');
  const search=page.locator('.variant-page input#search');
  const toggle=page.getByRole('button',{name:/Filters/});
  const batch=page.getByTestId('nfq-batch-toggle');
  await expect(search).toBeVisible();
  await expect(batch).toBeVisible();
  await expect(toggle).toBeVisible();
  const initial=await search.boundingBox();
  expect(initial).not.toBeNull();
  await toggle.click();
  const panel=page.getByTestId('nfq-guided-filters');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Refine results'})).toBeFocused();
  const area=await page.evaluate(()=>{
   const rect=(q:string)=>{const el=document.querySelector(q)!;const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
   return {
    search:rect('.variant-page .discovery-input'),
    buttons:rect('.variant-page .discovery-utility-row'),
    batch:rect('.variant-page .nfq-batch-toggle'),
    panel:rect('.variant-page .variant-filter-panel'),
    rail:rect('.variant-page .record-rail'),
    sidecar:document.querySelector('.variant-filter-panel.is-sidecar')!==null
   };
  });
  expect(area.batch.top).toBeGreaterThanOrEqual(area.buttons.top);
  expect(area.batch.bottom).toBeLessThanOrEqual(area.buttons.bottom+1);
  // The filter cannot intersect the active search field.
  const intersects=(a:{left:number;right:number;top:number;bottom:number},b:{left:number;right:number;top:number;bottom:number})=>
   a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  expect(intersects(area.panel,area.search)).toBe(false);
  expect(intersects(area.batch,area.search)).toBe(false);
  if(width>=1001){
   expect(area.sidecar).toBe(true);
   expect(area.panel.left).toBeGreaterThanOrEqual(area.rail.right-2);
  }else{
   expect(area.sidecar).toBe(false);
   expect(area.panel.top).toBeGreaterThanOrEqual(area.buttons.bottom-2);
   expect(area.panel.right).toBeLessThanOrEqual(area.rail.right+2);
  }
  await panel.locator('#class-filter').selectOption('I');
  await expect(toggle).toContainText('1 active');
  await panel.getByRole('button',{name:'Done'}).click();
  await expect(panel).toHaveCount(0);
  const result=await search.boundingBox();
  expect(result).not.toBeNull();
  expect(Math.abs(result!.y-initial!.y)).toBeLessThanOrEqual(2);
  await noHorizontalOverflow(page);
 }
});

test('14H154 atlas has no redundant index; map and picker share the same selected region across themes',async({page})=>{
 for(const mode of ['light','midnight'] as const){
  await setTheme(page,mode);
  await page.goto('/#/geography');
  const atlas=page.locator('.geo-observatory');
  await expect(atlas).toBeVisible();
  await expect(atlas.locator('#geo-scope, .geo-toolbar, .geo-international')).toHaveCount(0);
  const picker=atlas.getByLabel('Choose a region');
  await expect(picker).toHaveValue('');
  // The original index contributed no independent capability or data.
  await expect(atlas.locator('.geo-regions-section, #geo-region-list')).toHaveCount(0);
  await expect(atlas.getByRole('button',{name:/Browse all regions|Hide region list/})).toHaveCount(0);
  // The map is keyboard-operable and uses the same selected state as the picker.
  const galicia=atlas.locator('path.geo-region[aria-label^="Galicia"]');
  await galicia.focus();
  await galicia.press('Enter');
  await expect(picker).toHaveValue('12');
  await expect(galicia).toHaveAttribute('aria-pressed','true');
  await expect(atlas.locator('.geo-region-insight h3')).toHaveText('Galicia');
  await atlas.getByRole('button',{name:'Clear selection'}).click();
  await expect(picker).toHaveValue('');
  await expect(galicia).toHaveAttribute('aria-pressed','false');
  await picker.selectOption({label:'Andalucía'});
  await expect(atlas.locator('.geo-region-insight h3')).toHaveText('Andalucía');
  await expect(atlas.locator('path.geo-region[aria-label^="Andalucía"]')).toHaveAttribute('aria-pressed','true');
  // Keep the critical data-scope disclaimer, without restoring the obsolete cards.
  await expect(atlas.locator('.geo-about')).toContainText('Regional search statistics are not published');
  const colors=await atlas.locator('.geo-region-insight h3').evaluate(el=>{
   const x=getComputedStyle(el),p=getComputedStyle(el.closest('.geo-region-insight')!);
   return {ink:x.color,paper:p.backgroundColor};
  });
  expect(colors.ink).not.toBe(colors.paper);
  if(mode==='midnight')expect(colors.ink).toBe('rgb(237, 244, 255)');
  await noHorizontalOverflow(page);
 }
});

test('14H155 inline map preview and single-stop arrow navigation work without extra UI',async({page})=>{
 for(const [mode,width] of [['light',390],['midnight',1366]] as const){
  await page.setViewportSize({width,height:844});
  await setTheme(page,mode);
  await page.goto('/#/geography');
  const atlas=page.locator('.geo-observatory');
  const map=atlas.locator('svg[aria-label^="Selectable map of Spain"]');
  const regions=map.locator('path.geo-region');
  const context=atlas.getByTestId('geo-map-context');
  const picker=atlas.getByLabel('Choose a region');
  await expect(regions).toHaveCount(19);
  await expect(context).toHaveText('17 communities · 2 autonomous cities');
  await expect.poll(()=>regions.evaluateAll(nodes=>nodes.filter(node=>node.getAttribute('tabindex')==='0').length)).toBe(1);
  const initialHeight=await atlas.locator('.geo-map-heading').evaluate(el=>el.getBoundingClientRect().height);
  const first=regions.first();
  const second=regions.nth(1);
  await first.focus();
  await expect(first).toBeFocused();
  await expect(context).toContainText('Andalucía · Administrative boundary');
  await expect(atlas.locator('.geo-map-heading')).toBeVisible();
  const previewHeight=await atlas.locator('.geo-map-heading').evaluate(el=>el.getBoundingClientRect().height);
  expect(Math.abs(previewHeight-initialHeight)).toBeLessThanOrEqual(1);
  await first.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute('tabindex','-1');
  await expect(second).toHaveAttribute('tabindex','0');
  await expect(context).toContainText('Aragón · Administrative boundary');
  await second.press('Space');
  await expect(picker).toHaveValue('02');
  await expect(atlas.locator('.geo-region-insight h3')).toHaveText('Aragón');
  await second.press('Escape');
  await expect(picker).toHaveValue('');
  await second.press('End');
  await expect(regions.last()).toBeFocused();
  await regions.last().press('Home');
  await expect(first).toBeFocused();
  await picker.focus();
  await first.dispatchEvent('pointerenter');
  await expect(context).toContainText('Andalucía · Administrative boundary');
  await first.dispatchEvent('pointerleave');
  await expect(context).toHaveText('17 communities · 2 autonomous cities');
  await expect(atlas.locator('.geo-regions-section, #geo-region-list')).toHaveCount(0);
  await noHorizontalOverflow(page);
 }
});

test('14H153 workspace launcher stays compact with legible original blue hierarchy',async({page})=>{
 for(const mode of ['light','midnight'] as const){
  await setTheme(page,mode);
  await page.goto('/#/workspace');
  await page.getByRole('button',{name:'Open workspace switcher'}).click();
  const dialog=page.getByRole('dialog',{name:'Research workspace switcher'});
  await expect(dialog).toBeVisible();
  const search=dialog.getByRole('searchbox',{name:'Find a research workspace'});
  await expect(search).toBeFocused();
  const first=dialog.locator('.launcher-options button strong').first();
  await expect(first).toBeVisible();
  const colors=await first.evaluate(el=>({
   strong:getComputedStyle(el).color,button:getComputedStyle(el.closest('button')!).backgroundColor
  }));
  if(mode==='midnight')expect(colors.strong).toBe('rgb(230, 240, 255)');
  const close=dialog.getByRole('button',{name:'Close workspace switcher'});
  const size=await close.boundingBox();
  expect(size).not.toBeNull();
  expect(size!.width).toBeLessThanOrEqual(37);
  await search.fill('genotype');
  await expect(dialog.getByRole('button',{name:/Genotype/})).toBeVisible();
  await close.click();
  await expect(dialog).toHaveCount(0);
  await noHorizontalOverflow(page);
 }
});
