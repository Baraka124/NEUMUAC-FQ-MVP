import {test,expect,type Page} from '@playwright/test';

type Persona='administrator'|'contributor'|'guest'|'unassigned';
const accounts={
 administrator:'0dde93f1-cf9e-4143-8727-88e97ddd5f8d',
 contributor:'2b921eaf-983e-411c-93dc-cccbb4e6fa93',
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
  if(/nfq_research_memberships|nfq_guest_designations|nfq_professional_profiles/.test(path))console.log('PROFILE_TEST_REQUEST',persona,path);
  let data:unknown=[];
  if(path.endsWith('/nfq_research_memberships')&&(persona==='contributor'||persona==='administrator'))
   data=[{user_id:id,role:persona,revoked_at:null}];
  if(path.endsWith('/nfq_guest_designations')&&persona==='guest')
   data=[{user_id:id,status:'active'}];
  if(path.endsWith('/nfq_professional_profiles')&&(persona==='contributor'||persona==='administrator'))
   data=[{
    display_name:'María García',staff_type:'biomedical_engineer',
    department:'Pulmonology',research_group:'neumACt',research_line:null,
    source_verified_at:'2026-11-06T08:00:00Z'
   }];
  if(path.endsWith('/auth/v1/user'))data=user;
  await route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
 });
}
test('14H122 account profile: Administrator shows verified professional identity and people controls',async({page})=>{
 await mockFqAccount(page,'administrator');
 await page.goto('/#/admin');
 console.log('PROFILE_TEST_ACCOUNT','state',await page.locator('[data-testid="admin-membership-status"]').textContent());
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card).toContainText('María García');
 await expect(card).toContainText('neumACt');
 await expect(card.getByTestId('profile-role-label')).toHaveText('Administrator');
 await expect(page.getByTestId('admin-people-access')).toBeVisible();
 await expect(page.getByRole('button',{name:'Open permission editor'})).toBeVisible();
 await expect(page.getByLabel('Research account identifier')).not.toBeVisible();
});
test('14H122 account profile: Contributor cannot see permission-management controls',async({page})=>{
 await mockFqAccount(page,'contributor');
 await page.goto('/#/admin');
 console.log('PROFILE_TEST_ACCOUNT','state',await page.locator('[data-testid="admin-membership-status"]').textContent());
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('Research contributor');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
 await expect(page.getByTestId('admin-role-management')).toHaveCount(0);
});
test('14H122 account profile: Guest cannot acquire a professional identity or admin UI',async({page})=>{
 await mockFqAccount(page,'guest');
 await page.goto('/#/admin');
 console.log('PROFILE_TEST_ACCOUNT','state',await page.locator('[data-testid="admin-membership-status"]').textContent());
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
 console.log('PROFILE_TEST_ACCOUNT','state',await page.locator('[data-testid="admin-membership-status"]').textContent());
 const card=page.getByTestId('research-identity-card');
 await expect(card).toBeVisible();
 await expect(card.getByTestId('profile-role-label')).toHaveText('Awaiting assignment');
 await expect(page.getByTestId('admin-people-access')).toHaveCount(0);
});
