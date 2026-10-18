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
  await expect(page.getByRole('heading', { name: 'Helios', exact: true })).toBeVisible();
  await expect(page.getByText('Read-only preparation')).toBeVisible();
  await expect(page.getByTestId('helios-status-banner')).toContainText('Not connected');
  await expect(page.getByText('No live decisions available')).toBeVisible();
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
 await expect(page.getByRole('heading',{name:'Variant comparison'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Variant 1'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Variant 2'})).toBeVisible();
 await expect(page.getByRole('note',{name:'About this research comparison'})).toHaveCount(0);
 await page.locator('.nfq-pair-heading .nfq-context-help summary').click();
 await expect(page.getByRole('note',{name:'About this research comparison'})).toContainText('does not establish allelic phase');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('note',{name:'About this research comparison'})).toHaveCount(0);
 await page.locator('#genotype-search-0').fill('R117H');
 await expect(page.getByRole('alert')).toContainText('Live CFTR access is not configured');
 await expect(page.getByRole('button',{name:/DEMO-CFTR/i})).toHaveCount(0);
 await expect(page.locator('html')).toHaveJSProperty('scrollWidth',await page.locator('html').evaluate(e=>e.clientWidth));
});

test('intelligence never substitutes partial or fabricated coverage data',async({page})=>{
 await page.goto('/#/intelligence');
 await expect(page.getByRole('heading',{name:'Research coverage'})).toBeVisible();
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
 await expect(page.getByRole('heading',{name:'Variant comparison'})).toBeVisible();
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

test('Phase 3I independent search preferences retain a clean empty workbench',async({page})=>{
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
  // In the unconfigured test environment, no real variants are returned;
  // pagination belongs to a populated worklist, not to the empty search state.
  await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Variant result pages'})).toHaveCount(0);
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
  await expect(page.getByRole('heading',{name:'Research sign-in',exact:true})).toBeVisible();
  await expect(page.getByRole('status').getByText(/Account sign-in is not configured/)).toBeVisible();
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.workspace-launcher-trigger')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.goto('/#/sign-in');
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
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
  await expect(page.getByRole('heading',{name:'Research sign-in',exact:true})).toBeVisible();
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
 await expect(page.getByRole('heading',{name:'Geographic atlas'})).toBeVisible();
});

test('public Spain map works without account and is accessible at mobile and desktop widths',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:820});
  await page.goto('/#/geography');
  await expect(page.getByRole('heading',{name:'Geographic atlas',exact:true})).toBeVisible();
  await expect(page.locator('.geo-map-foot')).toContainText('Regional boundaries');
  await expect(page.locator('.geo-about')).toContainText('Regional search statistics are not published');
  await expect(page.locator('.geo-layout')).toBeVisible();
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
 await expect(page.getByRole('link',{name:/Explore geographic atlas/})).toHaveAttribute('href','#/geography');
 const nav=page.getByRole('navigation',{name:'Workspaces'});
 await expect(nav.getByRole('link',{name:'Geographic atlas'})).toBeVisible();
 await nav.getByRole('link',{name:'Geographic atlas'}).click();
 await expect(page.getByRole('heading',{name:'Geographic atlas',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Research overview'})).toBeVisible();
 await page.getByRole('button',{name:'Open workspace switcher'}).click();
 const launcher=page.getByRole('dialog',{name:'Research workspace switcher'});
 await launcher.getByRole('searchbox',{name:'Find a research workspace'}).fill('regional');
 await expect(launcher.getByRole('button',{name:/Geographic atlas/})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/workspace');
 await page.getByRole('button',{name:/workspaces/i}).click();
 await expect(page.getByRole('navigation',{name:'Mobile workspaces'}).getByRole('link',{name:'Geographic atlas'})).toBeVisible();
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

test('Phase 4F-6E empty research state has no misleading results or pager',async({page})=>{
 for(const width of [320,390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
  await expect(page.getByText('No matching variants.',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Visible results on this page')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Variant result pages'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Explore aggregated geographic research activity for Spain'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Phase 4F-6E collapsed navigation retains readable layout and focusable controls',async({page})=>{
 await page.setViewportSize({width:1366,height:850});
 await page.goto('/#/variants');
 await page.getByRole('button',{name:'Collapse sidebar'}).click();
 await expect(page.locator('.app-frame')).toHaveClass(/sidebar-collapsed/);
 await expect(page.getByRole('button',{name:'Expand sidebar'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Workspaces'}).getByRole('link',{name:'Variants'})).toBeVisible();
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 await page.getByRole('button',{name:'Expand sidebar'}).click();
 await expect(page.locator('.app-frame')).not.toHaveClass(/sidebar-collapsed/);
});

test('Phase 4F-6F landing editorial hierarchy and unselected research results stay responsive',async({page})=>{
 for(const width of [320,390,768,1024,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Research tools'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
  await expect(page.locator('.nfq-mobile-results-toggle')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('search guidance distinguishes unsafe notation and never shows stale no-match before query completion',async({page})=>{
 await page.goto('/#/variants');
 const search=page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'});
 await search.fill('c.123/124');
 await expect(page.getByText(/Slash notation is only searchable/)).toBeVisible();
 await expect(page.getByText(/No recorded variant matches this search/)).toHaveCount(0);
 await search.fill('1001+11C/T');
 await expect(page.getByText(/Slash notation is only searchable/)).toHaveCount(0);
 await expect(page.getByText(/No recorded variant matches this search/)).toHaveCount(0);
 await expect(page.getByRole('alert')).toContainText('public variant catalog has not been connected yet');
});

test('Phase 4F-6I search guidance is optional, literal and accessible across widths',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  const input=page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'});
  const guide=page.getByRole('note',{name:'Search guidance'});
  await expect(guide).toHaveCount(0);
  const info=page.getByRole('button',{name:'Search help and scientific data limitations'});
  await info.click();
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('1001+11C/T');
  await expect(guide).toContainText('does not translate or assume equivalence');
  await info.click();
  await expect(guide).toHaveCount(0);
  await input.fill('c.123/124');
  const guidance=page.getByRole('button',{name:'Search guidance'});
  await expect(guidance).toBeVisible();
  await guidance.click();
  await expect(guide).toBeVisible();
  await expect(guidance).toHaveAttribute('aria-expanded','true');
  await guidance.click();
  await expect(guide).toHaveCount(0);
  await input.fill('1001+11C/T');
  await expect(page.getByRole('button',{name:'Search guidance'})).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Phase 4F-7A coverage lens never invents counts when live register is unavailable',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/intelligence');
  await expect(page.getByRole('heading',{name:'Research coverage'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect(page.getByRole('navigation',{name:'Documentation coverage groups'})).toHaveCount(0);
  await expect(page.locator('.intelligence-record')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7B keeps record traceability and scientific class labels grounded in live data',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants');
  await expect(page.getByText('Public access · Read only')).toBeVisible().catch(async()=>{
   await expect(page.getByText('Data connection required')).toBeVisible();
  });
  await expect(page.locator('.nfq-class-pill')).toHaveCount(0);
  await page.goto('/#/intelligence');
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect(page.locator('.nfq-coverage-record-toggle')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7D internal return links survive workspace changes without live or invented records',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/evidence?from='+encodeURIComponent('/variants/12?q=1001%2B11C%2FT'));
  const back=page.getByRole('link',{name:'Return to variant dossier'});
  await expect(back).toHaveAttribute('href',/#\/variants\/12\?/);
  await back.click();
  await expect(page).toHaveURL(/#\/variants\/12\?/);
  await page.goto('/#/intelligence?from='+encodeURIComponent('/variants/12'));
  await expect(page.getByRole('link',{name:'Return to variant dossier'})).toBeVisible();
  await page.goto('/#/evidence?from='+encodeURIComponent('https://outside.example'));
  await expect(page.getByRole('link',{name:'Return to variant dossier'})).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7E map first and contextual explanation remain accessible at all widths',async({page})=>{
 for(const width of [320,390,768,1366,1600]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/geography');
  await expect(page.getByRole('heading',{name:'Geographic atlas'})).toBeVisible();
  const title=page.getByRole('heading',{name:'Geographic atlas'});
  const map=page.locator('.geo-map-surface');
  await expect(map).toBeVisible();
  // The disconnected CI preview displays an additional application notice.
  // The atlas still needs to start in the upper half of the 850px viewport.
  expect(await map.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(425);
  expect(await title.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(await map.evaluate(el=>el.getBoundingClientRect().top));
  await expect(page.getByRole('heading',{name:'Regional exploration'})).toHaveCount(0);
  const details=page.locator('.geo-about');
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  await expect(details).toContainText('Regional search statistics are not published');
  await details.locator('summary').click();
  await expect(details).not.toHaveAttribute('open');
  await page.getByLabel('Choose a region').selectOption('12');
  await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7F atlas does not advertise unavailable analysis modes and guides regional detail',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/geography');
  await expect(page.getByRole('group',{name:'Analysis mode'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Institutions'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Research gaps'})).toHaveCount(0);
  await expect(page.locator('path.geo-region')).toHaveCount(19);
  await page.getByLabel('Choose a region').selectOption('12');
  await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
  await expect(page.getByText('Galicia selected')).toBeVisible();
  const detail=page.getByRole('button',{name:'View region details'});
  if(width<=768){
   await expect(detail).toBeVisible();
   await detail.click();
   await expect(page.locator('#geo-region-detail')).toBeFocused();
  }else await expect(detail).toBeHidden();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7G contextual coverage information is discreet and keyboard accessible',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/intelligence');
  await expect(page.getByRole('heading',{name:'Research coverage'})).toBeVisible();
  await expect(page.getByRole('note',{name:'Understanding research coverage'})).toHaveCount(0);
  const trigger=page.locator('.nfq-coverage-heading summary');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('note',{name:'Understanding research coverage'})).toBeVisible();
  await expect(page.getByRole('note',{name:'Understanding research coverage'})).toContainText('not a measure of scientific strength');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('note',{name:'Understanding research coverage'})).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-7H functional compact search and preserved map capabilities',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/intelligence');
  await expect(page.getByRole('heading',{name:'Research coverage'})).toHaveCount(1);
  // CI intentionally has no configured research source; do not fabricate a coverage worklist.
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect(page.locator('#coverage-search')).toHaveCount(0);
  await page.getByRole('link',{name:'Research overview'}).click();
  await expect(page).toHaveURL(/#\/workspace/);
  await page.goto('/#/variants');
  await expect(page.getByRole('heading',{name:'Variants',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Search variants'})).toBeVisible();
  await page.goto('/#/geography');
  await expect(page.locator('path.geo-region')).toHaveCount(19);
  await page.getByLabel('Choose a region').selectOption('12');
  await expect(page.getByRole('heading',{name:'Galicia'})).toBeVisible();
  await page.getByRole('button',{name:'Clear selection'}).click();
  await page.getByRole('button',{name:'Browse all regions'}).click();
  await expect(page.locator('#geo-region-list')).toBeVisible();
  await page.getByLabel('Scope').selectOption('international');
  await expect(page.getByRole('button',{name:'Return to Spain'})).toBeVisible();
  await page.getByRole('button',{name:'Return to Spain'}).click();
  await expect(page.locator('path.geo-region')).toHaveCount(19);
 }
});

test('4F-7H exact dossier state can recover after query changes',async({page})=>{
 await page.goto('/#/variants/383?q=1001%2B11C%2FT');
 const search=page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'});
 await search.fill('R117H');
 await expect(page).toHaveURL(/#\/variants\?q=R117H/);
 await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Search variants'})).toBeVisible();
});

test('4F-8B scoped research navigation stays reversible and does not invent records',async({page})=>{
 for(const width of [390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/evidence?variant=383&from='+encodeURIComponent('/variants/383?q=1001%2B11C%2FT'));
  await expect(page.getByRole('heading',{name:'Evidence & provenance'})).toHaveCount(1);
  await expect(page.getByText('References for variant record #383')).toBeVisible();
  await expect(page.locator('#evidence-search')).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Live evidence access is not configured');
  await page.getByRole('link',{name:'All records'}).click();
  await expect(page.locator('#evidence-search')).toBeVisible();
  await page.goto('/#/intelligence?variant=383&from='+encodeURIComponent('/variants/383'));
  await expect(page.getByRole('heading',{name:'Research coverage'})).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect(page.getByRole('link',{name:'Return to variant dossier'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-9A sign-in stays compact, functional and accessible at all widths',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/sign-in');
  const card=page.locator('.nfq-login-card');
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toHaveCount(1);
  await expect(card).toBeVisible();
  const box=await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(392);
  expect(box!.height).toBeLessThan(410);
  await expect(page.locator('.nfq-signin-masthead img')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Account sign-in is not configured');
  const help=page.locator('.nfq-login-card .nfq-context-help summary');
  await help.click();
  await expect(page.getByRole('note',{name:'Research account access'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('note',{name:'Research account access'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Continue without signing in/})).toHaveAttribute('href','#/variants');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-9B landing sign-in is compact and shares accessible guidance',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  await page.getByRole('button',{name:/Sign in/}).click();
  const card=page.locator('#nfq-portal-account');
  await expect(card.getByRole('heading',{name:'Research sign-in'})).toHaveCount(1);
  await expect(card).toBeVisible();
  const dimensions=await card.boundingBox();
  expect(dimensions).not.toBeNull();
  expect(dimensions!.width).toBeLessThanOrEqual(392);
  expect(dimensions!.height).toBeLessThan(415);
  await expect(card.getByRole('status')).toContainText('Account sign-in is not configured');
  await card.locator('.nfq-context-help summary').click();
  await expect(card.getByRole('note',{name:'Research account access'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card.getByRole('note',{name:'Research account access'})).toHaveCount(0);
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(page.getByRole('heading',{name:'Research tools'})).toBeVisible();
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-9C sign-in stage stays proportional and does not add authentication features',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/sign-in');
  const stage=page.locator('.nfq-signin-stage');
  const card=page.locator('.nfq-login-card');
  const stageBox=await stage.boundingBox();
  const cardBox=await card.boundingBox();
  expect(stageBox).not.toBeNull();expect(cardBox).not.toBeNull();
  expect(stageBox!.height-cardBox!.height).toBeLessThanOrEqual(65);
  expect(stageBox!.width).toBeLessThanOrEqual(width);
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Account sign-in is not configured');
  await expect(page.getByRole('button',{name:'Show password'})).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('4F-10A paired variant routes keep identity and avoid false reference statements',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/genotype?a=18&b=383');
  await expect(page.getByRole('heading',{name:'Variant comparison'})).toHaveCount(1);
  await expect(page.getByRole('region',{name:'Variant 1'}).getByRole('alert')).toContainText('Live CFTR access is not configured');
  await expect(page.getByRole('region',{name:'Variant 2'}).getByRole('alert')).toContainText('Live CFTR access is not configured');
  await expect(page.getByText('No links are recorded for this variant in the accessible register.')).toHaveCount(0);
  await page.locator('#genotype-search-0').fill('R117H');
  await expect(page).toHaveURL(/#\/genotype\?b=383$/);
  await expect(page.locator('#genotype-search-0')).toHaveValue('R117H');
  await expect(page.getByRole('region',{name:'Variant 2'}).getByRole('alert')).toContainText('Live CFTR access is not configured');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Helios review areas stay accessible and do not imply authorized review operations',async({page})=>{
 await page.goto('/#/helios');
 await expect(page.getByRole('heading',{name:'Helios',exact:true})).toBeVisible();
 const history=page.getByTestId('helios-tab-history');
 await history.click();
 await expect(history).toHaveAttribute('aria-pressed','true');
 await expect(page.getByTestId('helios-panel-history')).toContainText('No live records or review actions');
 await expect(page.getByRole('button',{name:/approve|reject|claim/i})).toHaveCount(0);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Helios evidence assessment makes missing provenance explicit across viewports',async({page})=>{
 await page.goto('/#/helios');
 await page.getByTestId('helios-tab-evidence').click();
 const assessment=page.getByTestId('helios-panel-evidence');
 for(const name of ['Recorded value','Proposed change']){
  await expect(assessment.getByRole('region',{name})).toBeVisible();
 }
 await page.getByTestId('helios-step-sources').click();
 await expect(assessment.getByRole('region',{name:'Supporting evidence'})).toBeVisible();
 await expect(assessment).toContainText('No verified references loaded');
 await page.getByTestId('helios-step-uncertainty').click();
 await expect(assessment.getByRole('region',{name:'Uncertainty'})).toBeVisible();
 await expect(page.getByTestId('helios-step-uncertainty')).toHaveAttribute('aria-pressed','true');
 await expect(assessment).toContainText('No scientific decision is implied');
 await expect(page.getByRole('button',{name:/approve|reject|claim/i})).toHaveCount(0);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Helios Signals and History remain integrated, accessible and read only',async({page})=>{
 await page.goto('/#/helios');
 await page.getByTestId('helios-tab-signals').click();
 await expect(page.getByTestId('helios-panel-signals')).toContainText('Contradictions and drift');
 await expect(page.getByTestId('helios-panel-signals')).toContainText('Not connected');
 await page.getByTestId('helios-tab-history').click();
 await expect(page.getByTestId('helios-panel-history')).toContainText('Reviewer audit trail');
 await expect(page.getByTestId('helios-panel-history')).toContainText('Access restricted');
 await expect(page.getByRole('button',{name:/approve|reject|run scan/i})).toHaveCount(0);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});

test('Helios locked features explain that backend access is not yet connected',async({page})=>{
 await page.goto('/#/helios');
 await page.getByTestId('helios-tab-signals').click();
 const signals=page.getByTestId('helios-panel-signals');
 await expect(signals.getByTestId('helios-locked-capability')).toHaveCount(3);
 await expect(signals.getByTestId('helios-locked-capability').first()).toHaveAttribute('title',/authorization is not yet connected/);
 await page.getByTestId('helios-tab-history').click();
 await expect(page.getByTestId('helios-panel-history').getByTestId('helios-locked-capability')).toHaveCount(3);
});

test('Helios queue describes disconnected state without claiming denied access',async({page})=>{
 await page.goto('/#/helios');
 const queue=page.getByTestId('helios-panel-queue');
 await expect(queue.getByTestId('helios-review-read-state')).toContainText('Authorized review data has not been connected');
 await expect(page.getByTestId('helios-status-banner')).toContainText('Read-only preparation');
 await expect(page.getByRole('button',{name:/approve|reject|claim/i})).toHaveCount(0);
});

test('Helios Signals offers real read-only evidence navigation without enabling scans',async({page})=>{
 await page.goto('/#/helios');
 await page.getByTestId('helios-tab-signals').click();
 const signals=page.getByTestId('helios-panel-signals');
 await expect(signals.getByRole('link',{name:'Evidence & Curation'})).toHaveAttribute('href',/#?\/?evidence/);
 await expect(signals).toContainText('This does not run a Helios scan');
 await expect(page.getByRole('button',{name:/run scan|approve|reject/i})).toHaveCount(0);
});

test('Helios navigation keeps accessible selection semantics independent of displayed copy',async({page})=>{
 await page.goto('/#/helios');
 for(const section of ['queue','evidence','signals','history']){
  const tab=page.getByTestId('helios-tab-'+section);
  await expect(tab).toHaveAttribute('type','button');
  await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('helios-panel-'+section)).toBeVisible();
 }
 await expect(page.getByTestId('helios-panel-history').getByTestId('helios-locked-capability')).toHaveCount(3);
 await expect(page.getByRole('button',{name:/approve|reject|run scan/i})).toHaveCount(0);
});

test('saved variant worklist remains local, compact and honest without a catalog',async({page})=>{
 await page.goto('/#/variants');
 const toggle=page.getByTestId('saved-variants-toggle');
 await expect(toggle).toBeVisible();
 await toggle.click();
 const panel=page.getByTestId('saved-variants-panel');
 await expect(panel).toContainText('No saved variants on this browser');
 await expect(panel).toContainText('Local to this browser');
 await expect(panel.getByRole('button',{name:'Export links · CSV'})).toHaveCount(0);
 await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
});
test('saved worklist reopens an identity route without presenting cached scientific claims',async({page})=>{
 await page.addInitScript(()=>{window.localStorage.setItem('neumuacfq_saved_variant_ids_v1',JSON.stringify(['2','2','01','3']));});
 await page.goto('/#/variants');
 await page.getByTestId('saved-variants-toggle').click();
 const panel=page.getByTestId('saved-variants-panel');
 await expect(panel.getByRole('button',{name:'Open saved variant 2'})).toHaveCount(1);
 await expect(panel.getByRole('button',{name:'Open saved variant 3'})).toHaveCount(1);
 await expect(panel.getByRole('button',{name:'Export links · CSV'})).toBeVisible();
 await expect(panel).not.toContainText('01');
 await panel.getByRole('button',{name:'Open saved variant 2'}).click();
 await expect(page).toHaveURL(/#\/variants\/2/);
 await expect(page.getByTestId('saved-variants-panel')).toHaveCount(0);
});

test('share actions are not offered for unavailable scientific records',async({page})=>{
 await page.goto('/#/variants/2');
 await expect(page.getByTestId('copy-variant-record-link')).toHaveCount(0);
 await expect(page.getByTestId('save-current-variant')).toHaveCount(0);
});

test('partial CFTR search leaves the scientific canvas unselected even after Enter',async({page})=>{
 await page.goto('/#/variants');
 const search=page.getByRole('searchbox',{name:'Variant name, HGVS or recorded alias'});
 await search.fill('f508');
 await expect(search).toHaveValue('f508');
 await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
 await expect(page.locator('.research-preview')).toHaveCount(0);
 await search.press('Enter');
 await expect(page.getByRole('heading',{name:'Select a variant'})).toBeVisible();
 await expect(page).toHaveURL(/#\/variants\?q=f508/);
 await expect(page.getByRole('button',{name:'Open scientific dossier'})).toHaveCount(0);
});

test('Evidence workspace links copy real validated filter URLs and reject unsafe queries',async({page})=>{
 for(const width of [390,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/evidence?q=CFTR&page=2');
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{
    (window as Window & {__evidenceCopied?:string}).__evidenceCopied=value;
   }}});
  });
  const share=page.getByTestId('evidence-copy-view');
  await expect(share).toBeEnabled();
  await expect(page.getByRole('searchbox',{name:'Find a source or reference'})).toHaveValue('CFTR');
  await share.click();
  await expect(page.locator('.nfq-evidence-share-status')).toContainText('View link copied');
  expect(await page.evaluate(()=>(window as Window & {__evidenceCopied?:string}).__evidenceCopied)).toMatch(/#\/evidence\?q=CFTR&page=2$/);
  await page.getByRole('searchbox',{name:'Find a source or reference'}).fill('!invalid*');
  await share.click();
  await expect(page.locator('.nfq-evidence-share-status')).toContainText('Cannot copy this view link');
  await page.goto('/#/evidence?variant=383&page=1');
  await expect(share).toBeEnabled();
  await expect(page.getByText('References for variant record #383')).toBeVisible();
  await page.goto('/#/evidence?q=PMID&page=1');
  await expect(page.getByRole('searchbox',{name:'Find a source or reference'})).toHaveValue('PMID');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('Evidence page export never invents a CSV when live source is disconnected',async({page})=>{
 for(const width of [320,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/evidence?variant=383');
  await expect(page.getByTestId('evidence-copy-view')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Live evidence access is not configured');
  await expect(page.getByTestId('evidence-export-page')).toHaveCount(0);
  await page.goto('/#/evidence');
  await expect(page.getByTestId('evidence-export-page')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('two-record comparison share requires two retrieved source records, not URL text alone',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/genotype?a=18&b=383');
  const copy=page.getByTestId('comparison-copy-link');
  await expect(copy).toBeVisible();
  await expect(copy).toBeDisabled();
  await expect(page.locator('.genotype-locus')).toHaveCount(2);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('paired research export remains disabled until both complete reference reads succeed',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/genotype?a=18&b=383');
  const exportButton=page.getByTestId('comparison-download');
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await expect(page.getByTestId('comparison-copy-link')).toBeDisabled();
  await expect(page.locator('.genotype-locus')).toHaveCount(2);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('coverage worklist export is not available without a complete live research catalog',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/intelligence');
  await expect(page.getByRole('alert')).toContainText('Live research coverage connection is not configured');
  await expect(page.getByTestId('coverage-export-matches')).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('unconnected variant dossier does not invent review chronology or audit actions',async({page})=>{
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/variants/18');
  await expect(page.getByTestId('variant-history-panel')).toHaveCount(0);
  await expect(page.locator('.nfq-history-timeline li')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/approve validation|resolve conflict|sign audit/i})).toHaveCount(0);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
