import {expect,test} from '@playwright/test';

/** The dossier's subtype/ETI/Alyftrek fields are scientific annotations,
 * never calls-to-action. A test-only DOM fixture exercises the real loaded
 * CSS cascade without inventing or modifying a CFTR database record.
 */
test('recorded scientific facts render as quiet text, not button-like pills',async({page})=>{
 await page.setViewportSize({width:1366,height:850});
 await page.goto('/#/variants');
 await expect(page.locator('.variant-page')).toBeVisible();
 await page.locator('.variant-page').evaluate(container=>{
  const strip=document.createElement('div');
  strip.id='nfq-recorded-style-fixture';
  strip.className='nfq-dossier-classification-strip';
  strip.setAttribute('aria-label','Test-only visual style fixture');
  for(const [label,value,response] of [
   ['Subtype','standard',null],['ETI','Responsive','responsive'],
   ['Alyftrek','Non-responsive','non_responsive']
  ] as const){
   const fact=document.createElement('span');
   fact.className='nfq-recorded-fact';
   if(response)fact.dataset.response=response;
   const name=document.createElement('span');
   name.textContent=label;
   const result=document.createElement('strong');
   result.textContent=value;
   fact.append(name,result);
   strip.append(fact);
  }
  container.append(strip);
 });
 const facts=page.locator('#nfq-recorded-style-fixture .nfq-recorded-fact');
 await expect(facts).toHaveCount(3);
 await expect(facts.nth(1).locator('strong')).toHaveText('Responsive');
 await expect(facts.nth(2).locator('strong')).toHaveText('Non-responsive');
 const snapshot=async()=>facts.locator('strong').evaluateAll(nodes=>nodes.map(node=>{
  const style=getComputedStyle(node);
  return {
   background:style.backgroundColor,
   borderTop:parseFloat(style.borderTopWidth),
   borderBottom:parseFloat(style.borderBottomWidth),
   padLeft:parseFloat(style.paddingLeft),
   padRight:parseFloat(style.paddingRight),
   radius:parseFloat(style.borderTopLeftRadius),
   cursor:style.cursor,
   color:style.color,
   minHeight:style.minHeight
  };
 }));
 for(const state of ['light','midnight'] as const){
  const theme=page.locator('.app-frame');
  if(state==='midnight'){
   await page.getByTestId('nfq-research-theme-switch').click();
  }
  await expect(theme).toHaveAttribute('data-nfq-theme',state);
  const computed=await snapshot();
  for(const c of computed){
   expect(c.background).toBe('rgba(0, 0, 0, 0)');
   expect(c.borderTop).toBe(0);
   expect(c.borderBottom).toBe(0);
   expect(c.padLeft).toBe(0);
   expect(c.padRight).toBe(0);
   expect(c.radius).toBe(0);
   expect(c.cursor).not.toBe('pointer');
  }
  // Colors encode different recorded statuses without a fabricated button.
  expect(computed[1]?.color).not.toBe(computed[2]?.color);
 }
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
