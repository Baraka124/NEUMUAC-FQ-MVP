import {test,expect} from '@playwright/test';

test('14H146 governance is a real read-only oversight workspace and fails closed for public access',async({page})=>{
 await page.goto('/#/governance');
 await expect(page.getByRole('heading',{name:'Governance',exact:true})).toBeVisible();
 await expect(page.getByTestId('governance-role-status')).toContainText('Sign-in required');
 await expect(page.getByTestId('governance-review-restricted')).toBeVisible();
 await expect(page.getByText('Implementation pending')).toHaveCount(0);
 await expect(page.getByRole('link',{name:/Research sign-in/})).toHaveAttribute('href',/#\/sign-in/);
 await expect(page.getByRole('link',{name:/Recorded chronology reports/})).toHaveAttribute('href',/#\/reports/);
 await expect(page.getByRole('link',{name:/Helios scientific review/})).toHaveAttribute('href',/#\/helios/);
 await expect(page.locator('.nfq-gov-proposal')).toHaveCount(0);
});

test('14H146 footer is anchored to viewport bottom on a short research page in both themes',async({page})=>{
 // A fresh page navigation restores the preference from local storage; start
 // each viewport in Daylight to avoid falsely interpreting a saved toggle.
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','light'));
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/workspace');
  for(const theme of ['light','midnight'] as const){
   if(theme==='midnight'){
    if(width<=760){
     await page.getByRole('button',{name:'Workspaces',exact:true}).click();
     await page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('button',{name:'Switch to midnight theme'}).click();
     await page.getByRole('button',{name:'Workspaces',exact:true}).click();
    }else{
     await page.getByTestId('nfq-research-theme-switch').click();
    }
   }
   await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme',theme);
   const footer=page.locator('.page-footer'),box=await footer.boundingBox();
   expect(box).not.toBeNull();
   expect(Math.abs(box!.y+box!.height-900)).toBeLessThanOrEqual(3);
   expect(box!.height).toBeLessThanOrEqual(95);
   const background=await footer.evaluate(node=>getComputedStyle(node).backgroundColor);
   expect(background).not.toBe('rgba(0, 0, 0, 0)');
   if(theme==='midnight')expect(background).toBe('rgb(12, 20, 34)');
   await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  }
 }
});

test('14H146 Daylight/Midnight consistency survives navigation and context-help overlays',async({page})=>{
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/governance');
 await page.getByTestId('nfq-research-theme-switch').click();
 await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
 const views=['/workspace','/variants','/evidence','/helios','/genotype','/intelligence','/reports','/governance','/admin'];
 for(const path of views){
  await page.goto('/#'+path);
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  const backgrounds=await page.locator('.workspace-frame, .page-footer').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));
  expect(backgrounds[0]).toBe('rgb(5, 9, 26)');
  expect(backgrounds[1]).toBe('rgb(12, 20, 34)');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
 await page.goto('/#/governance');
 await page.locator('.nfq-context-help summary').click();
 const panel=page.locator('.nfq-context-help-panel');
 await expect(panel).toBeVisible();
 expect(await panel.evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(15, 29, 48)');
 await expect(page.locator('.nfq-context-help-title')).toHaveCSS('color','rgb(238, 245, 255)');
 await page.keyboard.press('Escape');
 await expect(panel).toBeHidden();
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const launcher=page.getByRole('dialog',{name:'Research workspace switcher'});
 await expect(launcher).toBeVisible();
 await expect(launcher.getByText('Governance',{exact:true})).toBeVisible();
 expect(await launcher.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
 await page.keyboard.press('Escape');
 await page.getByTestId('nfq-research-theme-switch').click();
 await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','light');
 const lightFooter=await page.locator('.page-footer').evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(lightFooter).not.toBe('rgb(12, 20, 34)');
});

test('14H146 phone Governance keeps live theme surfaces consistent in drawer and help',async({page})=>{
 await page.addInitScript(()=>window.localStorage.setItem('nfq-research-theme-v1','midnight'));
 for(const width of [320,390,430,760]){
  await page.setViewportSize({width,height:844});
  await page.goto('/#/governance');
  await expect(page.getByRole('heading',{name:'Governance',exact:true})).toBeVisible();
  expect(await page.locator('.nfq-gov-access').evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(15, 29, 48)');
  await page.locator('.nfq-context-help summary').click();
  await expect(page.locator('.nfq-context-help-panel')).toBeVisible();
  expect(await page.locator('.nfq-context-help-panel').evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(15, 29, 48)');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Workspaces',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'Mobile workspaces'});
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link',{name:'Governance'})).toBeVisible();
  expect(await nav.evaluate(node=>getComputedStyle(node).backgroundColor)).not.toBe('rgb(255, 255, 255)');
  await nav.getByRole('button',{name:'Switch to light theme'}).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','light');
  await nav.getByRole('button',{name:'Switch to midnight theme'}).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
  await nav.getByRole('link',{name:'Governance'}).click();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
