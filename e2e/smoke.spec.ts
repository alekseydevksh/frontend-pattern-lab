import { expect, test } from '@playwright/test';

test('the catalog page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Frontend Pattern Lab');
  await expect(page.getByRole('heading', { level: 1, name: 'Frontend Pattern Lab' })).toBeVisible();
});

test('an unknown route shows the not-found page', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
});
