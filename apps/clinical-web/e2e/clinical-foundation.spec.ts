import { test, expect } from '@playwright/test';

test('real-data-only boundary, navigation and horizontal containment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CFTR variant research', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore variant records' })).toHaveAttribute('href', '#/variants');
  const capabilities = page.getByRole('complementary', { name: 'Current capability' });
  await expect(capabilities).toContainText('Variant identities');
  await expect(capabilities).toContainText('Live read-only lookup');
  await expect(capabilities).toContainText('Sources and evidence');
  await expect(capabilities).toContainText('Recorded references; claims unverified');
  await expect(capabilities).toContainText('Variant-pair research');
  await expect(capabilities).toContainText('Editing and curation');
  await expect(capabilities).toContainText('Not yet available');
  await expect(page.getByText('Live CFTR research interface')).toBeVisible();
  await expect(page.getByRole('status').getByText('Live variant source · configuration pending')).toBeVisible();
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: /workspaces/i }).click();
    await page.getByRole('navigation', { name: 'Mobile workspaces' }).getByRole('link', { name: 'Variants' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' })).toHaveCount(0);
  } else {
    await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: /Variants/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Variant workspace' })).toBeVisible();
  if (page.viewportSize()!.width > 760) {
    await expect(page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Evidence & Curation' })).toBeVisible();
  } else {
    await page.getByRole('button', { name: /workspaces/i }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' }).getByRole('link', { name: 'Evidence & Curation' })).toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Helios Review' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('public variant catalog has not been connected yet');
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate(e => e.clientWidth));
});

test('unconfigured database never substitutes invented records', async ({ page }) => {
  await page.goto('/#/variants');
  await expect(page.getByRole('list', { name: 'Search results' })).toHaveCount(0);
  await expect(page.locator('.record-list button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /DEMO-CFTR/i })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search variant identifier' }).fill('R117H');
  await expect(page.getByRole('alert')).toContainText('public variant catalog has not been connected yet');
  await expect(page.getByRole('heading', { name: 'Select a variant' })).toBeVisible();
});

test('reserved workspaces do not imply clinical functionality', async ({ page }) => {
  await page.goto('/#/helios');
  await expect(page.getByRole('heading', { name: 'Helios Review' })).toBeVisible();
  await expect(page.getByText(/no backend connection, evidence interpretation/i)).toBeVisible();
});

test('keyboard skip target remains accessible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});


test('public research needs no sign-in and admin never exposes unapproved writes', async ({ page }) => {
  await page.goto('/#/variants');
  await expect(page.getByRole('heading', { name: 'Variant workspace' })).toBeVisible();
  // CI intentionally has no Supabase credentials. The public Explorer must
  // remain accessible without signing in and must not fabricate records.
  await expect(page.getByRole('alert')).toContainText('public variant catalog has not been connected yet');
  await expect(page.locator('.record-list button')).toHaveCount(0);
  await page.goto('/#/admin');
  await expect(page.getByRole('heading', { name: 'Research administration' })).toBeVisible();
  await expect(page.getByText(/Staff authentication is not configured here/)).toBeVisible();
  await expect(page.getByRole('region',{name:'Research operations readiness'})).toBeVisible();
  await expect(page.getByRole('complementary',{name:'Administration availability'})).toContainText('Not verifiable');
  await expect(page.getByRole('button', { name: /approve|publish|edit|save/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Explore public variants' })).toHaveAttribute('href', '#/variants');
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate(e => e.clientWidth));
});


test('sidebar expands, contracts and persists preference without hiding navigation', async ({ page }) => {
  await page.goto('/#/variants');
  const wideDesktop = page.viewportSize()!.width > 1180;
  if (page.viewportSize()!.width > 760) {
    if (!wideDesktop) {
      await expect(page.locator('.app-frame')).toHaveClass(/sidebar-collapsed/);
      await page.getByRole('button',{name:'Expand sidebar'}).click();
    }
    const toggle = page.getByRole('button',{name:'Collapse sidebar'});
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.app-frame')).toHaveClass(/sidebar-collapsed/);
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded','false');
    await expect(page.getByRole('navigation',{name:'Workspaces'}).getByRole('link',{name:'Variants'})).toBeVisible();
    await page.reload();
    await expect(page.locator('.app-frame')).toHaveClass(/sidebar-collapsed/);
    await page.getByRole('button',{name:'Expand sidebar'}).click();
    await expect(page.locator('.app-frame')).not.toHaveClass(/sidebar-collapsed/);
  } else {
    await expect(page.getByRole('button',{name:'Collapse sidebar'})).toBeHidden();
    await page.getByRole('button',{name:/workspaces/i}).click();
    await expect(page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('link',{name:'Research administration'})).toBeVisible();
  }
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth',await page.locator('html').evaluate(e=>e.clientWidth));
});


test('evidence module never substitutes static records when live source is unconfigured',async({page})=>{
 await page.goto('/#/evidence');
 await expect(page.getByRole('heading',{name:'Evidence & provenance'})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Live evidence access is not configured');
 await expect(page.locator('.evidence-row')).toHaveCount(0);
 await expect(page.locator('html')).toHaveJSProperty('scrollWidth',await page.locator('html').evaluate(e=>e.clientWidth));
});


test('genotype is a real-record two-variant research workflow with no clinical inference',async({page})=>{
 await page.goto('/#/genotype');
 await expect(page.getByRole('heading',{name:'Genotype research'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Variant 1'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Variant 2'})).toBeVisible();
 await expect(page.getByText(/does not establish allelic phase/)).toBeVisible();
 await page.locator('#genotype-search-0').fill('R117H');
 await expect(page.getByRole('alert')).toContainText('Live CFTR access is not configured');
 await expect(page.getByRole('button',{name:/DEMO-CFTR/i})).toHaveCount(0);
 await expect(page.locator('html')).toHaveJSProperty('scrollWidth',await page.locator('html').evaluate(e=>e.clientWidth));
});

test('intelligence never substitutes partial or fabricated coverage data',async({page})=>{
 await page.goto('/#/intelligence');
 await expect(page.getByRole('heading',{name:'Research intelligence'})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
 await expect(page.locator('.intelligence-record')).toHaveCount(0);
 await expect(page.locator('html')).toHaveJSProperty('scrollWidth',await page.locator('html').evaluate(e=>e.clientWidth));
});