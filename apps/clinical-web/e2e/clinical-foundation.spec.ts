import { test, expect } from '@playwright/test';

test('real-data-only boundary, navigation and horizontal containment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CFTR variant research', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore variant records' })).toHaveAttribute('href', '#/variants');
  await expect(page.getByRole('complementary', { name: 'Current capability' })).toContainText('Evidence and provenance');
  await expect(page.getByText('Real records only · access-controlled connection')).toBeVisible();
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: /workspaces/i }).click();
    await page.getByRole('navigation', { name: 'Mobile workspaces' }).getByRole('link', { name: 'Variants' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' })).toHaveCount(0);
  } else {
    await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: /Variants/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Variant workspace' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('authorized variant database connection has not been configured');
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate(e => e.clientWidth));
});

test('unconfigured database never substitutes invented records', async ({ page }) => {
  await page.goto('/#/variants');
  await expect(page.getByRole('alert')).toContainText('not been configured');
  await expect(page.getByRole('button', { name: /DEMO-CFTR/i })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search variant identifier' }).fill('R117H');
  await expect(page.getByRole('alert')).toContainText('not been configured');
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
