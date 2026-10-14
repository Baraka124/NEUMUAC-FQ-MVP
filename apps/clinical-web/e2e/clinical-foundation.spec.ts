import { test, expect } from '@playwright/test';

test('navigation, synthetic boundary and horizontal containment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /clinical workspace built around evidence/i })).toBeVisible();
  await expect(page.getByText('No patient data, medical recommendations, real evidence or live data connections.')).toBeVisible();
  if (page.viewportSize()!.width <= 760) {
    await page.getByRole('button', { name: /workspaces/i }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Mobile workspaces' }).getByRole('link', { name: 'Variants' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile workspaces' })).toHaveCount(0);
  } else {
    await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: /Variants/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Variant workspace' })).toBeVisible();
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate(e => e.clientWidth));
});

test('synthetic search and route detail preserve coherent state', async ({ page }) => {
  await page.goto('/#/variants');
  const search = page.getByRole('searchbox', { name: 'Search identifier or example alias' });
  await search.fill('EXAMPLE-BETA');
  await expect(page.getByRole('button', { name: /DEMO-CFTR-002/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /DEMO-CFTR-001/ })).toHaveCount(0);
  await page.getByRole('button', { name: /DEMO-CFTR-002/ }).click();
  await expect(page).toHaveURL(/#\/variants\/sample-002/);
  await expect(page.getByRole('heading', { name: 'DEMO-CFTR-002' })).toBeVisible();
  await search.fill('not-found');
  await expect(page.getByRole('status').filter({ hasText: 'No matching synthetic records. Adjust your search or review filter.' })).toBeVisible();
});

test('reserved workspaces explicitly deny implied clinical functionality', async ({ page }) => {
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
