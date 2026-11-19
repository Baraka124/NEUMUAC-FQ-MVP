import {expect,test} from '@playwright/test';

/** These are design-system contracts, not fabricated account sign-in tests.
 * The CI deployment has no configured authentication provider; real
 * authentication remains the existing controller's responsibility.
 */
test('public landing and both sign-in states use one navy/cool-white entry palette',async({page})=>{
 const tokens=async()=>page.locator('.nfq-entry-surface').evaluate(el=>{
  const css=getComputedStyle(el);
  return {
   background:css.backgroundColor,
   ink:css.getPropertyValue('--entry-ink').trim(),
   rule:css.getPropertyValue('--entry-rule').trim(),
   accent:css.getPropertyValue('--entry-accent').trim(),
   action:css.getPropertyValue('--entry-action').trim()
  };
 });
 await page.goto('/#/');
 const publicTokens=await tokens();
 expect(publicTokens.background).toBe('rgb(251, 252, 253)');
 expect(publicTokens.ink).toBe('#152b40');
 expect(publicTokens.action).toBe('#193b53');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 expect(await tokens()).toEqual(publicTokens);
 await expect(page.locator('#nfq-portal-account .nfq-access-panel')).toHaveCount(1);
 const inline=await page.locator('#nfq-portal-account').evaluate(el=>({
  bg:getComputedStyle(el).backgroundColor,
  borderLeft:getComputedStyle(el).borderLeftWidth
 }));
 expect(inline.bg).toBe('rgba(0, 0, 0, 0)');
 expect(parseFloat(inline.borderLeft)).toBeGreaterThan(0);
 await page.goto('/#/sign-in');
 expect(await tokens()).toEqual(publicTokens);
 await expect(page.locator('.nfq-login-card .nfq-access-panel')).toHaveCount(1);
 await expect(page.locator('.nfq-signin-art')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Research sign-in',exact:true})).toHaveCount(1);
 const dedicated=await page.locator('.nfq-login-card').evaluate(el=>({
  bg:getComputedStyle(el).backgroundColor,
  shadow:getComputedStyle(el).boxShadow
 }));
 expect(dedicated.bg).toBe('rgba(0, 0, 0, 0)');
 expect(dedicated.shadow).toBe('none');
});
test('one shared account panel preserves labels, help, recovery and public access',async({page})=>{
 await page.goto('/#/');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const inline=page.locator('#nfq-portal-account .nfq-access-panel');
 await expect(inline.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
 await expect(inline.getByText('Authorized accounts only')).toBeVisible();
 await expect(inline.getByRole('link',{name:'Reset password'})).toHaveAttribute('href','#/recover');
 await inline.locator('.nfq-context-help summary').click();
 await expect(inline.getByRole('note',{name:'Research account access'})).toBeVisible();
 await page.keyboard.press('Escape');
 await inline.getByRole('button',{name:'Return to research tools'}).click();
 await expect(page.getByRole('navigation',{name:'Research tools'})).toBeVisible();
 await page.goto('/#/sign-in');
 const dedicated=page.locator('.nfq-login-card .nfq-access-panel');
 await expect(dedicated.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
 await expect(dedicated.getByText('Authorized accounts only')).toBeVisible();
 await expect(dedicated.getByRole('link',{name:'Reset password'})).toHaveAttribute('href','#/recover');
 await expect(dedicated.getByRole('link',{name:'Continue without signing in'})).toHaveAttribute('href','#/variants');
});
test('real-entry layouts maintain readable hierarchy without horizontal clipping',async({page})=>{
 for(const width of [320,390,768,1024,1366]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/#/','/#/sign-in']){
   await page.goto(route);
   await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
   const logo=page.locator('.nfq-entry-surface .nfq-portal-brand img, .nfq-entry-surface .nfq-entry-logo img');
   await expect(logo).toHaveCount(1);
   await expect(logo).toBeVisible();
   const labels=await page.locator('.nfq-entry-surface').evaluate(el=>{
    const title=el.querySelector<HTMLElement>('.nfq-portal-intro h1, .nfq-access-heading h1, .nfq-signin-context h2')!;
    const s=getComputedStyle(title);
    return {font:s.fontFamily,color:s.color};
   });
   expect(labels.font).toMatch(/Iowan Old Style|Baskerville|Georgia/);
   expect(labels.color).toBe('rgb(21, 43, 64)');
  }
 }
});
test('shared auth form controls are not tinted, oversized or falsely interactive',async({page})=>{
 await page.goto('/#/');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const panel=page.locator('#nfq-portal-account .nfq-access-panel');
 await expect(panel.getByRole('status')).toContainText('Account sign-in is not configured');
 // CI has no auth provider. A temporary inert DOM fixture checks the real
 // CSS without submitting credentials or creating a simulated logged-in user.
 const optics=await panel.evaluate(host=>{
  const form=document.createElement('form');
  form.className='nfq-account-fields';
  form.setAttribute('aria-hidden','true');
  const label=document.createElement('label');label.textContent='Email address';
  const input=document.createElement('input');input.type='email';
  const button=document.createElement('button');button.type='submit';button.disabled=true;button.textContent='Sign in';
  form.append(label,input,button);host.append(form);
  const i=getComputedStyle(input),b=getComputedStyle(button),l=getComputedStyle(label);
  const result={inputBackground:i.backgroundColor,inputColor:i.color,inputHeight:input.getBoundingClientRect().height,
   buttonBackground:b.backgroundColor,buttonWidth:button.getBoundingClientRect().width,
   buttonHeight:button.getBoundingClientRect().height,labelColor:l.color};
  form.remove();return result;
 });
 expect(optics.inputBackground).toBe('rgb(255, 255, 255)');
 expect(optics.inputColor).toBe('rgb(21, 43, 64)');
 expect(optics.inputHeight).toBeLessThanOrEqual(44);
 expect(optics.buttonBackground).toBe('rgb(25, 59, 83)');
 expect(optics.buttonWidth).toBeLessThan(185);
 expect(optics.buttonHeight).toBeLessThanOrEqual(44);
 expect(optics.labelColor).toBe('rgb(73, 93, 113)');
});
