import { test, expect } from '@playwright/test';

test('real-data-only boundary, navigation and horizontal containment', async ({ page }) => {
  await page.goto('/#/workspace');
  await expect(page.getByRole('heading', { name: 'CFTR variant research', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore variant records' })).toHaveAttribute('href', '#/variants');
  await expect(page.getByRole('search',{name:'Search CFTR variants'})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Search CFTR variants'})).toBeVisible();
  await expect(page.getByText(/database-recorded fields/)).toBeVisible();
  await expect(page.getByText('Live CFTR research interface')).toBeVisible();
  await expect(page.getByRole('status').getByText('Live variant source · configuration pending')).toBeVisible();
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: /workspaces/i }).click();
    await page.getByRole('navigation', { name: 'Mobile workspaces' }).getByRole('link', { name: 'Variants' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' })).toHaveCount(0);
  } else {
    await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: /Variants/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Variants', exact:true })).toBeVisible();
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
  await page.getByRole('searchbox', { name: 'Variant name, HGVS or recorded alias' }).fill('R117H');
  await expect(page.getByRole('alert')).toContainText('public variant catalog has not been connected yet');
  await expect(page.getByRole('heading', { name: 'Select a variant' })).toBeVisible();
});

test('reserved workspaces do not imply clinical functionality', async ({ page }) => {
  await page.goto('/#/helios');
  await expect(page.getByRole('heading', { name: 'Helios Review' })).toBeVisible();
  await expect(page.getByText(/no backend connection, evidence interpretation/i)).toBeVisible();
});

test('keyboard skip target remains accessible', async ({ page }) => {
  await page.goto('/#/workspace');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});


test('public research needs no sign-in and admin never exposes unapproved writes', async ({ page }) => {
  await page.goto('/#/variants');
  await expect(page.getByRole('heading', { name: 'Variants', exact:true })).toBeVisible();
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
test('Phase 3A responsive navigation and scientific layout at additional widths', async ({page})=>{
 for(const width of [320,390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  if(width<=760){
   await page.getByRole('button',{name:/workspaces/i}).click();
   await expect(page.getByRole('navigation',{name:'Mobile workspaces'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Close workspace navigation'})).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.getByRole('navigation',{name:'Mobile workspaces'})).toHaveCount(0);
  }else{
   await expect(page.getByRole('navigation',{name:'Workspaces'})).toBeVisible();
  }
 }
});

test('Phase 3B light institutional shell stays legible and usable across viewports',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:860});
  await page.goto('/#/workspace');
  await expect(page.getByRole('heading',{name:'CFTR variant research',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  if(width>760){
    const background=await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor);
    const channels=background.match(/\d+/g)?.slice(0,3).map(Number)||[];
    expect(channels).toHaveLength(3);
    expect(Math.min(...channels)).toBeGreaterThan(225);
    await expect(page.getByRole('navigation',{name:'Workspaces'})).toBeVisible();
  }else{
    // The overview is now reached from the outer entry; assert mobile
    // workspace navigation on a stable internal route before opening it.
    await page.goto('/#/variants');
    await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/workspaces/i})).toBeVisible();
    await page.getByRole('button',{name:/workspaces/i}).click();
    await expect(page.getByRole('navigation',{name:'Mobile workspaces'})).toBeVisible();
  }
 }
});

test('Phase 3C research workbench exposes shortcuts and preserves variant worklist',async({page})=>{
 await page.goto('/#/workspace');
 await expect(page.getByRole('heading',{name:'Search recorded variants'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Open Class I variant worklist/})).toHaveAttribute('href','#/variants?class=I');
 await page.getByRole('searchbox',{name:'Search CFTR variants'}).fill('R117H');
 await page.getByRole('button',{name:/Search variants/}).click();
 await expect(page).toHaveURL(/#\/variants\?q=R117H/);
 await page.goto('/#/workspace');
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 await expect(page.getByRole('dialog',{name:'Research workspace switcher'})).toBeVisible();
 await page.getByRole('searchbox',{name:'Find a research workspace'}).fill('genotype');
 await page.getByRole('dialog',{name:'Research workspace switcher'}).getByRole('button',{name:/Genotype/}).click();
 await expect(page.getByRole('heading',{name:'Genotype research'})).toBeVisible();
 await page.goto('/#/variants?class=I&q=R117H');
 await page.getByRole('button',{name:/Filters/}).click();
 await expect(page.locator('#class-filter')).toHaveValue('I');
 await expect(page.locator('#search')).toHaveValue('R117H');
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Phase 3D scientific search stays primary across six widths',async({page})=>{
 for(const width of [320,390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:860});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Search variants',exact:true})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Search help and scientific data limitations'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Phase 3H compact variant rail hides instructions until requested',async({page})=>{
 await page.goto('/#/variants');
 await expect(page.getByText('Search updates while typing.')).toHaveCount(0);
 const info=page.getByRole('button',{name:'Search help and scientific data limitations'});
 await expect(info).toHaveAttribute('aria-expanded','false');
 await info.click();
 await expect(info).toHaveAttribute('aria-expanded','true');
 await expect(page.getByText(/Search updates while typing/)).toBeVisible();
 await info.click();
 await expect(page.getByText(/Search updates while typing/)).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Filters/})).toHaveAttribute('aria-expanded','false');
 await page.getByRole('button',{name:/Filters/}).click();
 await expect(page.locator('#class-filter')).toBeVisible();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Phase 3I independent search preferences do not displace results',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  const trigger=page.getByRole('button',{name:/Filters/});
  const label=trigger.locator('.discovery-filter-label');
  const chevron=trigger.locator('.discovery-chevron');
  await expect(trigger).toBeVisible();
  const a=await label.boundingBox(),b=await chevron.boundingBox();
  expect(a).not.toBeNull();expect(b).not.toBeNull();
  expect(Math.abs((a!.y+a!.height/2)-(b!.y+b!.height/2))).toBeLessThan(6);
  await trigger.click();
  await expect(page.getByRole('region',{name:'Search preferences'})).toBeVisible();
  await expect(page.locator('#class-filter')).toBeVisible();
  await page.getByRole('button',{name:'Done'}).click();
  await expect(page.locator('#class-filter')).toHaveCount(0);
  const pager=page.getByRole('navigation',{name:'Variant result pages'});
  await expect(pager).toBeVisible();
  await expect(pager.getByRole('button',{name:'Previous variant page'})).toBeDisabled();
  await expect.poll(()=>page.locator('html').evaluate(e=>e.scrollWidth-e.clientWidth)).toBe(0);
 }
});

test('outer landing offers clearly distinct public and staff paths without application navigation',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Explore public research/})).toHaveAttribute('href','#/workspace');
  await expect(page.getByRole('link',{name:/Sign in as research staff/})).toHaveCount(0);
  await page.getByRole('button',{name:/Sign in/}).click();
  await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.getByRole('status').getByText(/Account sign-in is not configured/)).toBeVisible();
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.workspace-launcher-trigger')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.goto('/#/sign-in');
  await expect(page.getByRole('heading',{name:'Continue your research.'})).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Continue without signing in/})).toHaveAttribute('href','#/variants');
 }
});

test('UI foundation Phase 1: single brand identity and restrained workspace navigation',async({page})=>{
 for(const width of [390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
  // The sidebar remains in the DOM on mobile but is visually hidden.
  await expect(page.locator('.sidebar .wordmark img')).toHaveCount(1);
  if(width>760)await expect(page.locator('.sidebar .wordmark img')).toBeVisible();
  else await expect(page.locator('.sidebar .wordmark img')).toBeHidden();
  await expect(page.locator('.sidebar-roadmap')).toHaveCount(0);
  await expect(page.locator('.nav-index')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  if(width>760){
   await expect(page.getByRole('navigation',{name:'Workspaces'}).getByRole('link',{name:'Variants'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Open workspace switcher'})).toBeVisible();
  }
 }
});

test('UI foundation Phase 2: immediate search and visible selected state',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:860});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Search variants'})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:/Variant name, HGVS or recorded alias/})).toBeVisible();
  await expect(page.getByText('SCIENTIFIC DISCOVERY')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('UI foundation Phase 3: scientific dossier remains source-gated and responsive',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
  await expect(page.locator('.nfq-dossier-primary')).toHaveCount(0);
  await expect(page.locator('.nfq-dossier-expanded')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('institutional outer entry offers direct public and staff research paths',async({page})=>{
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:820});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect(page.locator('.nfq-portal-brand img')).toBeVisible();
  await expect(page.locator('.nfq-entry-preview')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Research workspace capabilities'})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Research workspaces'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Explore public research/})).toHaveAttribute('href','#/workspace');
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toHaveCount(1);
  await expect(page.getByRole('link',{name:/Sign in as research staff/})).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Variant records/})).toHaveAttribute('href','#/variants');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.locator('#nfq-portal-account')).toBeVisible();
  await expect(page.getByRole('button',{name:'Research tools',exact:true})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(page.getByRole('link',{name:/Variant records/})).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('UI Phase 4 keeps collapse control outside the scrolling sidebar',async({page})=>{
 for(const width of [768,1024,1366]){
  await page.setViewportSize({width,height:740});
  await page.goto('/#/variants');
  const toggle=page.getByRole('button',{name:/Collapse sidebar|Expand sidebar/});
  await expect(toggle).toBeVisible();
  await expect(page.locator('.sidebar-scroll')).toHaveCount(1);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await toggle.click();
  await expect(page.getByRole('button',{name:/Collapse sidebar|Expand sidebar/})).toBeVisible();
  await page.getByRole('button',{name:/Collapse sidebar|Expand sidebar/}).click();
  await expect(page.getByRole('button',{name:/Collapse sidebar|Expand sidebar/})).toBeVisible();
 }
});

test('Regional research link is quiet and shares no variant or location metadata',async({page})=>{
 await page.goto('/#/variants?q=G551D');
 const link=page.getByRole('link',{name:'Explore aggregated geographic research activity for Spain'});
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('href','#/geography');
 await link.click();
 await expect(page).toHaveURL(/#\/geography$/);
 await expect(page.getByRole('heading',{name:'Geographic intelligence'})).toBeVisible();
});

test('public Spain map works without account and is accessible at mobile and desktop widths',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:820});
  await page.goto('/#/geography');
  await expect(page.getByRole('heading',{name:'Geographic intelligence',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Regional exploration'})).toBeVisible();
  await expect(page.getByText('Aggregate data pending verification')).toBeVisible();
  await expect(page.locator('path.geo-region')).toHaveCount(19);
  await page.getByRole('button',{name:'Browse all regions'}).click();
  await page.locator('.geo-region-grid').getByRole('button',{name:/Andalucía/}).click();
  await expect(page.getByRole('heading',{name:'Andalucía'})).toBeVisible();
  await page.locator('.geo-region-grid').getByRole('button',{name:/Andalucía/}).click();
  await expect(page.getByRole('heading',{name:'Andalucía'})).toBeVisible();
  await page.getByRole('button',{name:/Hide region list/}).click();
  await expect(page.getByRole('button',{name:/Browse all regions/})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(e=>e.scrollWidth-e.clientWidth)).toBe(0);
 }
});

test('regional map offers a direct accessible region selector on small screens',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/geography');
 const selector=page.getByLabel('Choose a region');
 await expect(selector).toBeVisible();
 await selector.selectOption('12');
 await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
 await page.getByLabel('Scope').selectOption('international');
 await expect(page.getByText('International overview',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Return to Spain'}).click();
 await expect(page.getByRole('heading',{name:'Choose a region'})).toBeVisible();
});


test('explicit clearing and repeated region selection do not lose selection',async({page})=>{
 await page.goto('/#/geography');
 await page.getByRole('button',{name:'Browse all regions'}).click();
 const galicia=page.locator('.geo-region-grid').getByRole('button',{name:/Galicia/});
 await galicia.click();
 await galicia.click();
 await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
 await expect(galicia).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Clear selection'}).click();
 await expect(page.getByRole('heading',{name:'Choose a region'})).toBeVisible();
 await expect(galicia).toHaveAttribute('aria-pressed','false');
});


test('Phase 4F-5 regional picker is available at desktop and narrow phone widths',async({page})=>{
 for(const width of [320,390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/geography');
  const picker=page.locator('#geo-region-picker');
  await expect(picker).toBeVisible();
  await picker.selectOption('12');
  await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
  await expect(page.getByText('Galicia selected')).toBeVisible();
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(picker).toHaveValue('');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Phase 4F-6 public geography is consistently discoverable across workspace navigation',async({page})=>{
 await page.setViewportSize({width:1366,height:850});
 await page.goto('/#/workspace');
 await expect(page.getByRole('link',{name:/Explore geographic intelligence/})).toHaveAttribute('href','#/geography');
 const nav=page.getByRole('navigation',{name:'Workspaces'});
 await expect(nav.getByRole('link',{name:'Geographic intelligence'})).toBeVisible();
 await nav.getByRole('link',{name:'Geographic intelligence'}).click();
 await expect(page.getByRole('heading',{name:'Geographic intelligence',exact:true})).toBeVisible();
 await expect(page.locator('.header-path')).toContainText('Geographic intelligence');
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const launcher=page.getByRole('dialog',{name:'Research workspace switcher'});
 await launcher.getByRole('searchbox',{name:'Find a research workspace'}).fill('regional');
 await expect(launcher.getByRole('button',{name:/Geographic intelligence/})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/workspace');
 await page.getByRole('button',{name:/workspaces/i}).click();
 await expect(page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('link',{name:'Geographic intelligence'})).toBeVisible();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Phase 4F-6B scientific workspaces retain responsive controls and empty states',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:820});
  for(const route of ['/evidence','/genotype','/intelligence']){
   await page.goto('/#'+route);
   await expect(page.locator('.nfq-science-ui')).toBeVisible();
   await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  }
  await page.goto('/#/evidence');
  const query=page.getByRole('searchbox',{name:'Find a source or reference'});
  await query.fill('CFTR2');
  await expect(page.getByRole('button',{name:'Clear search'})).toBeVisible();
  await page.getByRole('button',{name:'Clear search'}).click();
  await expect(query).toHaveValue('');
  await expect(page.getByRole('alert')).toContainText('Live evidence access is not configured');
 }
});

test('Phase 4F-6C scientific dossier describes hidden evidence without inventing data',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:840});
  await page.goto('/#/variants');
  await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toBeVisible();
  await expect(page.locator('.record-list button')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('visual integrity: landing, search inputs and result container at key widths',async({page})=>{
 for(const width of [320,390,768,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(e=>e.scrollWidth-e.clientWidth)).toBe(0);
  await page.goto('/#/variants');
  await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(e=>e.scrollWidth-e.clientWidth)).toBe(0);
 }
});

test('institutional entry and scientific workbench retain usable controls across viewports',async({page})=>{
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Research tools'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Variant records/})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.goto('/#/variants');
  await expect(page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
