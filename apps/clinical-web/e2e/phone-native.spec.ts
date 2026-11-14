import {test,expect} from '@playwright/test';

// 14H142 · Owner-supplied Android Chrome recording, 2026-11-14.
// A layout that merely avoids overflow is insufficient: the phone must have
// legible identity, discernible controls and one primary vertical scroll.
test('phone header has recognizable navigation, brand, workspace search and theme access',async({page})=>{
 for(const width of [320,390,430,760]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/variants');
  const menu=page.getByRole('button',{name:'Open workspaces'});
  const brand=page.getByRole('link',{name:'neumuacFQ research overview'});
  const launcher=page.getByRole('button',{name:'Open workspace switcher'});
  await expect(menu).toBeVisible();
  await expect(brand).toBeVisible();
  await expect(launcher).toBeVisible();
  await expect(launcher.locator('svg.nfq-phone-launcher-icon')).toBeVisible();
  await expect(page.locator('.header-overview-link')).toBeHidden();
  const dimensions=await Promise.all([menu,brand,launcher,page.locator('.nfq-header-right')]
   .map(el=>el.boundingBox()));
  expect(dimensions.every(Boolean)).toBe(true);
  for(let i=0;i<dimensions.length-1;i++){
   expect(dimensions[i]!.x+dimensions[i]!.width)
    .toBeLessThanOrEqual(dimensions[i+1]!.x+2);
  }
  expect(dimensions[3]!.x+dimensions[3]!.width).toBeLessThanOrEqual(width+1);
  await launcher.click();
  await expect(page.getByRole('dialog',{name:'Research workspace switcher'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Research workspace switcher'})).toHaveCount(0);
  await menu.click();
  const nav=page.getByRole('navigation',{name:'Mobile workspaces'});
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link',{name:'Helios'})).toBeVisible();
  await expect(nav.getByRole('button',{name:'Switch to midnight theme'})).toBeVisible();
  await nav.getByRole('button',{name:'Switch to midnight theme'}).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  await nav.getByRole('button',{name:'Switch to light theme'}).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','light');
  await nav.getByRole('link',{name:'Helios'}).click();
  await expect(nav).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Helios',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('phone Helios has one compact swipeable review rail, not a two-row tile grid',async({page})=>{
 for(const width of [320,390,430,760]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/helios');
  const nav=page.getByRole('group',{name:'Helios review areas'});
  await expect(nav).toBeVisible();
  const geometry=await nav.evaluate(el=>{
   const style=getComputedStyle(el);
   const buttons=[...el.querySelectorAll('button')];
   return {display:style.display,flexWrap:style.flexWrap,
    overflowX:style.overflowX,positions:buttons.map(button=>button.getBoundingClientRect().top)};
  });
  expect(geometry.display).toBe('flex');
  expect(geometry.flexWrap).toBe('nowrap');
  expect(['auto','scroll']).toContain(geometry.overflowX);
  expect(geometry.positions.length).toBe(4);
  expect(Math.max(...geometry.positions)-Math.min(...geometry.positions)).toBeLessThan(3);
  await nav.getByRole('button',{name:'Signals'}).click();
  await expect(page.getByRole('heading',{name:'Signals',exact:true})).toBeVisible();
  await nav.getByRole('button',{name:'Evidence assessment'}).click();
  await expect(page.getByRole('heading',{name:'Evidence assessment',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('desktop keeps its existing full institutional header and workspace navigation',async({page})=>{
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/variants');
 await expect(page.locator('.nfq-phone-wordmark')).toBeHidden();
 await expect(page.locator('.nfq-phone-launcher-icon')).toBeHidden();
 await expect(page.locator('.mobile-menu-button')).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Workspaces'})).toBeVisible();
 const launcher=page.getByRole('button',{name:'Open workspace switcher'});
 await expect(launcher.locator('kbd')).toBeVisible();
 await expect(page.locator('.nfq-theme-switch')).toBeVisible();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
