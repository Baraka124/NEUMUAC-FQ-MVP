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
