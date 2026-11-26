import { expect, test } from '@playwright/test';
import { waitForHydration } from './support';

/**
 * The metric tiles above the diagram must show their whole label on a small phone (375 px wide):
 * a label wraps onto a second line rather than being cut off ("CLIENT VS…"), and the three values
 * stay level when one label wraps. Every ready lesson is checked: the list comes from the catalog
 * page, so a new lesson is covered the day it is added.
 */

test.use({ viewport: { width: 375, height: 812 } });

test('every lesson shows its metric labels in full at 375 px', async ({ page }) => {
  await page.goto('/');
  const urls = await page
    .locator('main a[href^="/lessons/"]')
    .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')!))]);
  expect(urls.length, 'ready lessons on the catalog').toBeGreaterThanOrEqual(2);

  for (const url of urls) {
    await page.goto(url);
    await waitForHydration(page);
    const tiles = await page.locator('div[data-tone]').evaluateAll((elements) =>
      elements.map((tile) => {
        const label = tile.firstElementChild as HTMLElement;
        const value = tile.lastElementChild as HTMLElement;
        const t = tile.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        return {
          label: label.textContent,
          // Text that does not fit would be wider than its box, or stick out of the tile.
          overflows: label.scrollWidth > label.clientWidth || l.right > t.right || l.left < t.left,
          clipped: getComputedStyle(label).textOverflow === 'ellipsis',
          valueTop: Math.round(value.getBoundingClientRect().top),
        };
      }),
    );
    expect(tiles, url).toHaveLength(3);
    for (const tile of tiles) {
      expect(tile.overflows, `${url}: "${tile.label}" does not fit`).toBe(false);
      expect(tile.clipped, `${url}: "${tile.label}" is cut off`).toBe(false);
    }
    expect(new Set(tiles.map((t) => t.valueTop)).size, `${url}: the values are level`).toBe(1);
  }
});
