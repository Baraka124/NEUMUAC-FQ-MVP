import {expect,test} from '@playwright/test';

/** These are design-system contracts, not fabricated account sign-in tests.
 * The CI deployment has no configured authentication provider; real
 * authentication remains the existing controller's responsibility.
 */
test('public landing and both sign-in states use one navy/cool-white entry palette',async({page})=>{
 await page.setViewportSize({width:1366,height:900});
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
 expect(publicTokens.background).toBe('rgb(255, 255, 255)');
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
 expect(parseFloat(inline.borderLeft)).toBe(0);
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


test('capture desktop and phone editorial entrance compositions for optical review',async({page},info)=>{
 // Screenshots are CI-only, never exported by the production application.
 // The unconfigured CI auth source is temporarily replaced by BLANK inert
 // visual controls: no account, password or authenticated session is created.
 async function addInertForm(){
  await page.locator('.nfq-access-panel .nfq-account-form').evaluate(el=>{
   const original=el.querySelector<HTMLElement>('.nfq-account-unavailable');
   if(original)original.hidden=true;
   const mock=document.createElement('form');
   mock.className='nfq-account-fields';
   mock.dataset.visualOnly='true';
   mock.setAttribute('aria-hidden','true');
   mock.addEventListener('submit',e=>e.preventDefault());
   const emailLabel=document.createElement('label');emailLabel.textContent='Email address';
   const email=document.createElement('input');email.type='email';email.autocomplete='off';
   const passLabel=document.createElement('label');passLabel.textContent='Password';
   const holder=document.createElement('div');holder.className='nfq-password-control';
   const password=document.createElement('input');password.type='password';password.autocomplete='off';
   const reveal=document.createElement('button');reveal.type='button';reveal.className='nfq-password-toggle';
   reveal.setAttribute('aria-label','Show password');
   reveal.textContent='◉';
   holder.append(password,reveal);
   const enter=document.createElement('button');enter.type='submit';enter.textContent='Sign in';
   mock.append(emailLabel,email,passLabel,holder,enter);
   el.append(mock);
  });
 }
 const project=info.project.name.replace(/[^a-z0-9-]/gi,'-');
 for(const width of [390,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await page.screenshot({path:info.outputPath(`entry-qa-${project}-${width}-public.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
  await addInertForm();
  await page.screenshot({path:info.outputPath(`entry-qa-${project}-${width}-inline-form-visual-fixture.png`),fullPage:true,animations:'disabled'});
  await page.goto('/#/sign-in');
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
  await addInertForm();
  await page.screenshot({path:info.outputPath(`entry-qa-${project}-${width}-dedicated-form-visual-fixture.png`),fullPage:true,animations:'disabled'});
 }
});


test('optical reading alignment is consistent and mobile sign-in is not buried',async({page})=>{
 await page.setViewportSize({width:1366,height:900});
 await page.goto('/#/');
 const dir=await page.locator('.nfq-portal-index-top').boundingBox();
 expect(dir).not.toBeNull();
 await page.goto('/#/sign-in');
 const access=await page.locator('.nfq-access-heading').boundingBox();
 expect(access).not.toBeNull();
 expect(Math.abs(dir!.y-access!.y)).toBeLessThanOrEqual(45);
 await page.setViewportSize({width:390,height:900});
 await page.goto('/#/');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const account=await page.locator('#nfq-portal-account').boundingBox();
 expect(account).not.toBeNull();
 expect(account!.y).toBeLessThan(270);
 await expect(page.getByRole('link',{name:/Explore public research/})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
});


test('logo has generous optical space and no decorative rules dominate the entry',async({page})=>{
 for(const width of [390,1366]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/#/','/#/sign-in']){
   await page.goto(route);
   const layout=await page.locator('.nfq-entry-surface').evaluate(root=>{
    const mast=root.querySelector<HTMLElement>('.nfq-portal-masthead,.nfq-signin-masthead')!;
    const brand=mast.querySelector<HTMLElement>('.nfq-portal-brand,.nfq-entry-logo')!;
    const img=brand.querySelector<HTMLImageElement>('img')!;
    const main=root.querySelector<HTMLElement>('.nfq-portal-content,.nfq-signin-main')!;
    const footer=root.querySelector<HTMLElement>('.nfq-portal-footer,.nfq-signin-footer')!;
    const notice=root.querySelector<HTMLElement>('.nfq-portal-research-notice');
    const b=mast.getBoundingClientRect(),l=brand.getBoundingClientRect(),image=img.getBoundingClientRect(),
     m=main.getBoundingClientRect();
    const n=notice?getComputedStyle(notice):null;
    return {headerTop:parseFloat(getComputedStyle(mast).borderTopWidth),
      headerBottom:parseFloat(getComputedStyle(mast).borderBottomWidth),
      footerTop:parseFloat(getComputedStyle(footer).borderTopWidth),
      noticeTop:n?parseFloat(n.borderTopWidth):0,
      brandTop:l.top-b.top,brandBottom:b.bottom-l.bottom,
      logoWidth:image.width,logoLeft:l.left,
      contentLeft:m.left+parseFloat(getComputedStyle(main).paddingLeft),
      canvas:getComputedStyle(root).backgroundColor};
   });
   expect(layout.headerTop).toBe(0);
   expect(layout.headerBottom).toBe(0);
   expect(layout.footerTop).toBe(0);
   expect(layout.noticeTop).toBe(0);
   expect(layout.brandTop).toBeGreaterThanOrEqual(0);
   expect(layout.brandBottom).toBeGreaterThanOrEqual(0);
   expect(Math.abs(layout.logoLeft-layout.contentLeft)).toBeLessThanOrEqual(3);
   expect(layout.canvas).toBe('rgb(255, 255, 255)');
  }
 }
});
