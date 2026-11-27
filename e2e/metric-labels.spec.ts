import { expect, test } from '@playwright/test';
import { readyEntries } from '../content/lessons/catalog';
import { waitForHydration } from './support';

/**
 * The metric tiles above the diagram must show their whole label on a small phone (375 px wide):
 * a label wraps onto a second line rather than being cut off ("CLIENT VS…"), and the three values
 * stay level when one label wraps; and each value fits its tile on one line at every step. Every
 * ready lesson is checked: the list comes from the catalog, so a new lesson is covered the day it
 * is added.
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

/**
 * A metric value is at most seven characters, so it fits a 375 px phone on one line. This plays
 * every step of every ready lesson (the final state of each, with reduced motion) and fails if a
 * value is wider than its tile or wraps.
 */
for (const entry of readyEntries) {
  test(`${entry.title}: every metric value fits its tile on one line at 375 px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/lessons/${entry.slug}/`);
    await waitForHydration(page);
    for (let step = 1; step <= entry.stepCount; step += 1) {
      if (step > 1) await page.keyboard.press('ArrowRight');
      await expect(page.getByText(`Step ${step} of ${entry.stepCount}`)).toBeVisible();
      const values = await page.locator('div[data-tone]').evaluateAll((tiles) =>
        tiles.map((tile) => {
          const value = tile.lastElementChild as HTMLElement;
          const style = getComputedStyle(tile);
          const room =
            tile.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          const range = document.createRange();
          range.selectNodeContents(value);
          const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          return { text: value.textContent, fits: value.scrollWidth <= room, lines: tops.size };
        }),
      );
      for (const v of values) {
        expect(v.fits, `step ${step}: "${v.text}" is wider than its tile`).toBe(true);
        expect(v.lines, `step ${step}: "${v.text}" wraps`).toBeLessThanOrEqual(1);
      }
    }
  });
}
