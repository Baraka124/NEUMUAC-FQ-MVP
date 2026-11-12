import {test,expect,type Page} from '@playwright/test';

type Persona='administrator'|'contributor'|'reviewer'|'guest'|'unassigned';
const accounts={
 administrator:'0dde93f1-cf9e-4143-8727-88e97ddd5f8d',
 contributor:'2b921eaf-983e-411c-93dc-cccbb4e6fa93',
 reviewer:'e1ea43bd-f5d9-4912-858d-53dcf2f099ae',
 guest:'4c9e2796-0c24-4487-9914-3cd351abc777',
 unassigned:'4c9e2796-0c24-4487-9914-3cd351abc778'
};
async function mockFqAccount(page:Page,persona:Persona){
 const id=accounts[persona];
 const email='test-'+persona+'@example.org';
 const user={
  id,email,aud:'authenticated',role:'authenticated',
  app_metadata:{provider:'email',providers:['email']},
  user_metadata:{},created_at:'2026-01-01T00:00:00Z'
 };
 const session={
  access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxODkzNDU2MDAwfQ.test',
  refresh_token:'synthetic-test-refresh',token_type:'bearer',
  expires_in:3600,expires_at:1893456000,user
 };
 await page.addInitScript(({storageKey,value})=>{
  window.localStorage.setItem(storageKey,JSON.stringify(value));
 },{storageKey:'sb-example-auth-token',value:session});
 await page.route('https://example.supabase.co/**',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(route.request().method()==='OPTIONS'){
   await route.fulfill({status:204,headers});return;
  }
  const path=new URL(route.request().url()).pathname;
  let data:unknown=[];
  if(path.endsWith('/nfq_research_memberships')&&(persona==='contributor'||persona==='administrator'||persona==='reviewer'))
   data=[{user_id:id,role:persona,revoked_at:null}];
  if(path.endsWith('/nfq_guest_designations')&&persona==='guest')
   data=[{user_id:id,status:'active'}];
  if(path.endsWith('/nfq_professional_profiles')&&(persona==='contributor'||persona==='administrator'))
   data=[{
    display_name:'María García',staff_type:'biomedical_engineer',
    department:'Pulmonology',research_group:'neumACt',research_line:null,
    source_verified_at:'2026-11-06T08:00:00Z'
   }];
  if(path.endsWith('/rpc/nfq_admin_list_research_accounts')&&persona==='administrator')
   data=[{
    user_id:accounts.guest,account_email:'guest@example.org',
    account_created_at:'2026-01-15T12:00:00Z',
    email_confirmed:true,research_role:null,role_revoked_at:null
   }];

  if(path.endsWith('/auth/v1/user'))data=user;
  await route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
 });
}
test('14H122 account profile: Administrator shows verified professional identity and people controls',async({page})=>{
 await mockFqAccount(page,'administrator');
 await page.goto('/#/admin');
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card).toContainText('María García');
 await expect(card).toContainText('neumACt');
 await expect(card.getByTestId('profile-role-label')).toHaveText('Administrator');
 await expect(page.getByTestId('admin-people-access')).toBeVisible();
 await expect(page.getByRole('button',{name:'Use verified account ID'})).toBeVisible();
 await expect(page.getByTestId('admin-role-management')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Manage research permissions for guest@example.org'})).toBeVisible();
});
test('14H122 account profile: Contributor cannot see permission-management controls',async({page})=>{
 await mockFqAccount(page,'contributor');
 await page.goto('/#/admin');
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('Research contributor');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
 await expect(page.getByTestId('admin-role-management')).toHaveCount(0);
});
test('14H122 account profile: Guest cannot acquire a professional identity or admin UI',async({page})=>{
 await mockFqAccount(page,'guest');
 await page.goto('/#/admin');
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('External guest');
 await expect(card).not.toContainText('María García');
 await expect(card).toContainText('no linked institutional profile');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
});
test('14H122 account profile: unassigned login never presents a verified research role',async({page})=>{
 await mockFqAccount(page,'unassigned');
 await page.goto('/#/admin');
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('Awaiting assignment');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
});


test('14H123 People & Access: search loads, opens selected member, and requires explicit approval',async({page})=>{
 await mockFqAccount(page,'administrator');
 const writes:unknown[]=[];
 await page.route('https://example.supabase.co/rest/v1/rpc/nfq_admin_set_member_role',async route=>{
  writes.push(JSON.parse(route.request().postData()||'null'));
  await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}});
 });
 await page.goto('/#/admin');
 const people=page.getByTestId('admin-people-access');
 await expect(people).toBeVisible();
 await expect(people.getByRole('button',{name:'Manage research permissions for guest@example.org'})).toBeVisible();
 await expect(people.getByRole('button',{name:'Open permission editor'})).toHaveCount(0);
 await people.getByRole('button',{name:'Manage research permissions for guest@example.org'}).click();
 const inspector=people.getByTestId('admin-role-management');
 await expect(inspector).toBeVisible();
 await expect(inspector).toContainText('guest@example.org');
 await expect(inspector.getByLabel('Account ID')).toHaveValue(accounts.guest);
 const save=inspector.getByRole('button',{name:'Save permission'});
 await expect(save).toBeDisabled();
 await inspector.getByLabel('Research role').selectOption('contributor');
 await expect(writes).toHaveLength(0);
 await inspector.getByRole('checkbox').check();
 await expect(save).toBeEnabled();
 await save.click();
 await expect.poll(()=>writes.length).toBe(1);
 expect(writes[0]).toEqual({
  target_user_id:accounts.guest,new_role:'contributor',revoke_access:false
 });
 await expect(people).toContainText('Research permission assigned');
 await expect(inspector).toHaveCount(0);
});
test('14H123 People & Access: searching and access editor never appear for Guest',async({page})=>{
 await mockFqAccount(page,'guest');
 await page.goto('/#/admin');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
 await expect(page.getByRole('searchbox',{name:'Find an FQ account by email'})).toHaveCount(0);
});

test('14H124 Reviewer sees operational source queue but no account administration',async({page})=>{
 await mockFqAccount(page,'reviewer');
 await page.goto('/#/admin');
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('Scientific reviewer');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
 const review=page.getByTestId('source-review-workspace');
 await expect(review).toBeVisible();
 await expect(review.getByRole('button',{name:'Refresh reviews'})).toBeVisible();
 await expect(review.getByText(/No submitted source corrections/)).toBeVisible();
 await expect(page.getByRole('heading',{name:'Source review queue'})).toBeVisible();
});

test('14H126 Administrator invitation: no send before explicit confirmation and history is read-only',async({page})=>{
 await mockFqAccount(page,'administrator');
 const deliveries:{email:string,kind:string}[]=[];
 const invitations:{id:string,email:string,kind:string,status:string,createdAt:string,updatedAt:string}[]=[];
 let reads=0;
 await page.route('https://example.supabase.co/functions/v1/nfq-admin-invite',async route=>{
  const method=route.request().method();
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(method==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  if(method==='GET'){
   reads++;
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({status:'ready',invitations})});
   return;
  }
  if(method==='POST'){
   const payload=JSON.parse(route.request().postData()||'{}');
   deliveries.push(payload);
   invitations.push({id:'9a6a0489-6c29-4e57-8144-c4e82c946aff',email:payload.email,kind:payload.kind,
    status:'sent',createdAt:'2026-11-10T12:00:00Z',updatedAt:'2026-11-10T12:00:00Z'});
   await route.fulfill({status:202,headers,contentType:'application/json',body:JSON.stringify({status:'invitation-requested'})});
   return;
  }
  await route.fulfill({status:405,headers});
 });
 await page.goto('/#/admin');
 const panel=page.getByTestId('admin-invitations');
 await expect(panel.getByRole('button',{name:'Invite researcher'})).toBeEnabled();
 await expect.poll(()=>reads).toBeGreaterThan(0);
 expect(deliveries).toHaveLength(0);
 await panel.getByRole('button',{name:'Invite researcher'}).click();
 const send=panel.getByRole('button',{name:'Send invitation'});
 await expect(send).toBeDisabled();
 await panel.getByLabel('Recipient email').fill('guest@example.org');
 await expect(panel.getByText(/already has an FQ account/)).toBeVisible();
 await expect(send).toBeDisabled();
 await panel.getByLabel('Recipient email').fill(' NEW.CLINICIAN@EXAMPLE.ORG ');
 await panel.getByRole('radio',{name:'Clinician / researcher'}).check();
 await expect(send).toBeDisabled();
 await panel.getByRole('checkbox',{name:/confirmed the recipient/}).check();
 await expect(send).toBeEnabled();
 await send.click();
 await expect.poll(()=>deliveries.length).toBe(1);
 expect(deliveries).toEqual([{email:'new.clinician@example.org',kind:'clinician'}]);
 await expect(panel).toContainText('Invitation requested for new.clinician@example.org');
 await panel.getByText('Recent invitation requests').click();
 await expect(panel.getByTestId('admin-invitation-history')).toContainText('new.clinician@example.org');
 await panel.getByRole('button',{name:'Refresh'}).click();
 expect(deliveries).toHaveLength(1);
});
test('14H126 disabled invitation backend keeps send unavailable',async({page})=>{
 await mockFqAccount(page,'administrator');
 await page.route('https://example.supabase.co/functions/v1/nfq-admin-invite',async route=>{
  await route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:'disabled'})});
 });
 await page.goto('/#/admin');
 const panel=page.getByTestId('admin-invitations');
 await expect(panel).toContainText('Invitation service unavailable or unverified');
 await expect(panel.getByRole('button',{name:'Invite researcher'})).toBeDisabled();
});
test('14H126 Contributor and Reviewer have no invitation sender or invitation history',async({page})=>{
 for(const persona of ['contributor','reviewer'] as const){
  await mockFqAccount(page,persona);
  await page.goto('/#/admin');
  await expect(page.getByTestId('admin-invitations')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Invite researcher'})).toHaveCount(0);
 }
});

test('14H129 Guest designation is separate from Reviewer permissions and explicitly audited',async({page})=>{
 await mockFqAccount(page,'administrator');
 const writes:unknown[]=[];
 let active=false;
 await page.route('https://example.supabase.co/rest/v1/rpc/nfq_admin_get_guest_access',async route=>{
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
    body:JSON.stringify([{is_active:active,designation_reason:null,designated_at:null}])});
 });
 await page.route('https://example.supabase.co/rest/v1/rpc/nfq_admin_set_guest_access',async route=>{
  const payload=JSON.parse(route.request().postData()||'{}');
  writes.push(payload);
  active=payload.p_action==='grant';
  await route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});
 });
 await page.goto('/#/admin');
 await page.getByRole('button',{name:'Manage research permissions for guest@example.org'}).click();
 const panel=page.getByTestId('admin-guest-access');
 await expect(panel).toBeVisible();
 await expect(panel.getByTestId('guest-designation-status')).toContainText('Not designated');
 const submit=panel.getByRole('button',{name:'Designate external Guest'});
 await expect(submit).toBeDisabled();
 await panel.getByLabel('Reason for designation').fill('External research access requested by study team');
 await expect(submit).toBeDisabled();
 await panel.getByRole('checkbox',{name:/verified the account/}).check();
 await expect(submit).toBeEnabled();
 await submit.click();
 await expect.poll(()=>writes.length).toBe(1);
 expect(writes[0]).toEqual({p_user_id:accounts.guest,p_action:'grant',
  p_reason:'External research access requested by study team'});
 await expect(panel.getByTestId('guest-designation-status')).toContainText('Active');
 await expect(panel.getByRole('status')).toContainText('Guest access designated and verified.');
 await panel.getByLabel('Reason for revocation').fill('End of invited research observation');
 await panel.getByRole('checkbox',{name:/verified the account/}).check();
 await panel.getByRole('button',{name:'Revoke Guest access'}).click();
 await expect.poll(()=>writes.length).toBe(2);
 expect(writes[1]).toEqual({p_user_id:accounts.guest,p_action:'revoke',p_reason:'End of invited research observation'});
 await expect(panel.getByTestId('guest-designation-status')).toContainText('Not designated');
 await expect(panel.getByRole('status')).toContainText('Guest access revoked and verified.');
});
test('14H129 Reviewer never sees Guest designation administration',async({page})=>{
 await mockFqAccount(page,'reviewer');
 await page.goto('/#/admin');
 await expect(page.getByTestId('admin-guest-access')).toHaveCount(0);
});


test('14H130 uncertain invitation never allows a second dispatch in the same session',async({page})=>{
 await mockFqAccount(page,'administrator');
 let posts=0,reads=0;
 await page.route('https://example.supabase.co/functions/v1/nfq-admin-invite',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const method=route.request().method();
  if(method==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  if(method==='GET'){
   reads++;
   await route.fulfill({status:200,headers,contentType:'application/json',
    body:JSON.stringify({status:'ready',invitations:[]})});
   return;
  }
  posts++;
  await route.fulfill({status:503,headers,contentType:'application/json',body:'{}'});
 });
 await page.goto('/#/admin');
 const panel=page.getByTestId('admin-invitations');
 await panel.getByRole('button',{name:'Invite researcher'}).click();
 await panel.getByLabel('Recipient email').fill('uncertain@example.org');
 await panel.getByRole('checkbox',{name:/confirmed the recipient/}).check();
 await panel.getByRole('button',{name:'Send invitation'}).click();
 await expect.poll(()=>posts).toBe(1);
 await expect(panel.getByText(/blocked from another send/)).toBeVisible();
 await expect.poll(()=>reads).toBeGreaterThan(1);
 await expect(panel.getByRole('button',{name:'Send invitation'})).toBeDisabled();
 await panel.getByRole('button',{name:'Refresh'}).click();
 await expect(panel.getByRole('button',{name:'Send invitation'})).toBeDisabled();
 expect(posts).toBe(1);
});


test('14H137C5 administrator invitation composer restores focus and never bypasses send confirmation',async({page})=>{
 await mockFqAccount(page,'administrator');
 let posts=0;
 await page.route('https://example.supabase.co/functions/v1/nfq-admin-invite',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  if(route.request().method()==='POST')posts++;
  await route.fulfill({status:200,contentType:'application/json',headers,
   body:JSON.stringify({status:'ready',invitations:[]})});
 });
 await page.setViewportSize({width:1366,height:850});
 await page.goto('/#/admin');
 const panel=page.getByTestId('admin-invitations');
 const launch=panel.getByRole('button',{name:'Invite researcher'});
 await expect(launch).toBeEnabled();
 await launch.click();
 const composer=panel.getByTestId('admin-invite-composer');
 await expect(composer).toBeVisible();
 await expect(panel.getByLabel('Recipient email')).toBeFocused();
 await expect(launch).toHaveAttribute('aria-expanded','true');
 await expect(panel.getByRole('button',{name:'Send invitation'})).toBeDisabled();
 await panel.getByLabel('Recipient email').fill('scientist@example.org');
 await panel.getByRole('radio',{name:'External guest'}).check();
 await expect(composer.getByRole('button',{name:'Send invitation'})).toBeDisabled();
 await page.keyboard.press('Escape');
 await expect(composer).toHaveCount(0);
 await expect(launch).toBeFocused();
 await expect(launch).toHaveAttribute('aria-expanded','false');
 await launch.click();
 await expect(panel.getByLabel('Recipient email')).toBeFocused();
 await expect(panel.getByLabel('Recipient email')).toHaveValue('');
 await expect(panel.getByRole('checkbox',{name:/confirmed the recipient/})).not.toBeChecked();
 await panel.getByRole('button',{name:'Cancel'}).click();
 await expect(launch).toBeFocused();
 expect(posts).toBe(0);
 await page.getByTestId('nfq-research-theme-switch').click();
 await expect(page.locator('.app-frame')).toHaveAttribute('data-nfq-theme','midnight');
 await expect(panel).toHaveCSS('background-color','rgb(15, 29, 48)');
 await launch.click();
 await expect(panel.getByLabel('Recipient email')).toBeFocused();
 await expect(panel.getByLabel('Recipient email')).toHaveCSS('background-color','rgb(17, 31, 51)');
 await expect(composer.getByRole('button',{name:'Send invitation'})).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 expect(posts).toBe(0);
});

test('14H137C5 administrator role editor stays accessible and quiet across desktop and phone',async({page})=>{
 await mockFqAccount(page,'administrator');
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/admin');
  const people=page.getByTestId('admin-people-access');
  await expect(people).toBeVisible();
  const member=people.getByRole('button',{name:'Manage research permissions for guest@example.org'});
  await expect(member).toBeVisible();
  await member.click();
  const inspector=people.getByTestId('admin-role-management');
  await expect(inspector).toBeVisible();
  await expect(inspector.getByLabel('Account ID')).toBeFocused();
  await expect(inspector.getByLabel('Account ID')).toHaveValue(accounts.guest);
  await expect(inspector.getByRole('button',{name:'Save permission'})).toBeDisabled();
  const saveMetrics=await inspector.locator('.nfq-save-role').evaluate(el=>({
   width:el.getBoundingClientRect().width,
   height:el.getBoundingClientRect().height,
   background:getComputedStyle(el).backgroundColor
  }));
  expect(saveMetrics.height,String(width)).toBeGreaterThanOrEqual(40);
  expect(saveMetrics.background).toBe('rgba(0, 0, 0, 0)');
  const close=inspector.getByRole('button',{name:'Close permission editor'});
  await close.click();
  await expect(inspector).toHaveCount(0);
  await expect(member).toBeFocused();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
 await page.setViewportSize({width:1366,height:820});
 await page.goto('/#/admin');
 const people=page.getByTestId('admin-people-access');
 await page.getByTestId('nfq-research-theme-switch').click();
 await expect(people).toHaveCSS('background-color','rgb(15, 29, 48)');
 await people.getByRole('button',{name:'Manage research permissions for guest@example.org'}).click();
 const inspector=people.getByTestId('admin-role-management');
 await expect(inspector.getByLabel('Account ID')).toHaveCSS('background-color','rgb(17, 31, 51)');
 await expect(inspector.locator('.nfq-save-role')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(inspector.getByRole('button',{name:'Save permission'})).toBeDisabled();
});
