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

test('14H153 atlas shares one selected region across map, picker and index; Midnight text remains visible',async({page})=>{
 for(const mode of ['light','midnight'] as const){
  await setTheme(page,mode);
  await page.goto('/#/geography');
  const atlas=page.locator('.geo-observatory');
  await expect(atlas).toBeVisible();
  await expect(atlas.getByLabel('Scope')).toHaveValue('spain');
  await expect(atlas.getByLabel('Choose a region')).toHaveValue('');
  const index=atlas.getByRole('button',{name:/Browse all regions/});
  await index.click();
  await expect(atlas.locator('#geo-region-list')).toBeVisible();
  await atlas.locator('#geo-region-list').getByRole('button',{name:/Galicia/}).click();
  await expect(atlas.getByLabel('Choose a region')).toHaveValue('12');
  await expect(atlas.locator('.geo-region-insight h3')).toHaveText('Galicia');
  // The alphabetical index remains open so another region can be selected;
  // it is a second control over the same single selected-region state.
  await expect(atlas.locator('#geo-region-list')).toBeVisible();
  await atlas.getByRole('button',{name:/Hide region list/}).click();
  await expect(atlas.locator('#geo-region-list')).toHaveCount(0);
  await atlas.getByRole('button',{name:'Clear selection'}).click();
  await expect(atlas.getByLabel('Choose a region')).toHaveValue('');
  await atlas.getByLabel('Choose a region').selectOption({label:'Andalucía'});
  await expect(atlas.locator('.geo-region-insight h3')).toHaveText('Andalucía');
  const colors=await atlas.locator('.geo-region-insight h3').evaluate(el=>{
   const x=getComputedStyle(el),p=getComputedStyle(el.closest('.geo-region-insight')!);
   return {ink:x.color,paper:p.backgroundColor};
  });
  expect(colors.ink).not.toBe(colors.paper);
  if(mode==='midnight')expect(colors.ink).toBe('rgb(237, 244, 255)');
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
