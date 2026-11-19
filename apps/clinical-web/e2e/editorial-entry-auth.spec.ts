import {expect,test} from '@playwright/test';

/* Visual geometry contracts for the real public gateway and dedicated sign-in
 * route. CI has no configured Supabase: never manufacture an authenticated
 * session or claim a login flow works without the actual backend.
 */
test('public entry remains a compact editorial gateway at every breakpoint',async({page})=>{
 for(const width of [320,390,768,1024,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Research tools'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Explore public research/})).toHaveAttribute('href','#/workspace');
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  const layout=await page.locator('.nfq-portal-intro h1').evaluate(el=>{
   const css=getComputedStyle(el),r=el.getBoundingClientRect();
   return {font:css.fontFamily,size:parseFloat(css.fontSize),lines:r.height/parseFloat(css.lineHeight)};
  });
  expect(layout.size).toBeLessThanOrEqual(62);
  if(width>=1024)expect(layout.lines).toBeLessThanOrEqual(2.5);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
test('inline research sign-in is an integrated panel, not a tinted card',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const card=page.locator('#nfq-portal-account');
  await expect(card.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
  await expect(card.getByRole('status')).toContainText('Account sign-in is not configured');
  await expect(card.getByRole('link',{name:'Reset password'})).toHaveAttribute('href','#/recover');
  const computed=await card.evaluate(el=>{
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   return {bg:s.backgroundColor,shadow:s.boxShadow,top:parseFloat(s.borderTopWidth),
    left:parseFloat(s.borderLeftWidth),width:r.width};
  });
  expect(computed.bg).toBe('rgba(0, 0, 0, 0)');
  expect(computed.shadow).toBe('none');
  expect(computed.width).toBeLessThanOrEqual(392);
  expect(computed.left).toBe(0);
  expect(computed.top).toBe(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(page.getByRole('navigation',{name:'Research tools'})).toBeVisible();
 }
});
test('dedicated sign-in shares the clean research entrance without artificial illustration',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/sign-in');
  const card=page.locator('.nfq-login-card'),stage=page.locator('.nfq-signin-stage');
  await expect(card.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
  await expect(page.locator('.nfq-signin-art')).toHaveCount(0);
  await expect(page.locator('.nfq-signin-masthead img')).toHaveCount(1);
  const logo=await page.locator('.nfq-signin-masthead img').boundingBox();
  expect(logo).not.toBeNull();
  // The approved square artwork contains transparent margins. Preserve the
  // *framed asset size* rather than shrinking it into an 83px-tall image.
  expect(logo!.width).toBeGreaterThanOrEqual(width<=420?115:width<=760?145:165);
  await expect(page.getByRole('link',{name:'Reset password'})).toHaveAttribute('href','#/recover');
  await expect(page.getByRole('link',{name:/Continue without signing in/})).toHaveAttribute('href','#/variants');
  const presentation=await card.evaluate(el=>{
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   return {bg:s.backgroundColor,shadow:s.boxShadow,width:r.width};
  });
  expect(presentation.bg).toBe('rgba(0, 0, 0, 0)');
  expect(presentation.shadow).toBe('none');
  expect(presentation.width).toBeLessThanOrEqual(392);
  const visual=await stage.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(visual).toBe('none');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
test('auth form optics stay compact when the real service is absent in CI',async({page})=>{
 await page.goto('/#/');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const host=page.locator('#nfq-portal-account');
 await expect(host.getByRole('status')).toContainText('Account sign-in is not configured');
 // Test-only static controls exercise the authored CSS; these are not
 // connected to an auth service and cannot submit credentials.
 const layout=await host.evaluate(el=>{
  const form=document.createElement('div');
  form.className='nfq-account-fields';
  form.setAttribute('aria-hidden','true');
  const input=document.createElement('input');input.type='email';
  const submit=document.createElement('button');submit.type='button';submit.textContent='Sign in';
  submit.setAttribute('type','submit');submit.disabled=true;
  form.append(input,submit);el.append(form);
  const i=getComputedStyle(input),b=getComputedStyle(submit);
  const result={inputHeight:input.getBoundingClientRect().height,
   inputBackground:i.backgroundColor,buttonWidth:submit.getBoundingClientRect().width,
   buttonHeight:submit.getBoundingClientRect().height,
   buttonBackground:b.backgroundColor};
  form.remove();return result;
 });
 expect(layout.inputHeight).toBeLessThanOrEqual(44);
 expect(layout.inputBackground).toBe('rgb(255, 255, 255)');
 expect(layout.buttonWidth).toBeLessThan(210);
 expect(layout.buttonHeight).toBeLessThanOrEqual(44);
 expect(layout.buttonBackground).not.toBe('rgba(0, 0, 0, 0)');
});
