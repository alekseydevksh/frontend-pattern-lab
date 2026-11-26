import { expect, test } from '@playwright/test';
import {
  advance,
  diagram,
  expectEveryStepAxeClean,
  expectMetrics,
  expectPacketAxeClean,
  expectStep,
  expectVerdicts,
  groupOpacity,
  key,
  lastStepButton,
  openFrozen,
  packets,
  stepTitle,
  text,
} from './lesson-helpers';
import { storeTheme, waitForHydration } from './support';

/**
 * Lesson 3, Virtualization, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/virtualization.ts. The step card and
 * layout-shift checks at desktop and phone width run for every ready lesson in
 * step-card.spec.ts and layout-shift.spec.ts; the metric labels at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/virtualization/';
const STEPS = 7;
/** The metrics once only the window is mounted (steps 3 to 7). */
const WINDOW = ['10,000|neutral', '48|good', '6 ms|good'];
const ALL = ['10,000|neutral', '60,000|bad', '900 ms|bad'];

test.describe('lesson 3: Virtualization', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Virtualization');
    await expect(page.getByText('03. Rendering and performance / Lesson 3 of 12')).toBeVisible();
    await expect(page.getByText('7 steps')).toBeVisible();

    // 1. One request, ten thousand rows, all of them mounted.
    await expectStep(
      page,
      1,
      STEPS,
      'Thousands of rows, all in the DOM',
      'Next: Infinite scroll →',
    );
    await expect(diagram(page)).toHaveAccessibleName(/^A browser panel with a list/);
    await expect(text(page, 'illustrative numbers')).toBeVisible();
    await expect(text(page, 'Row 1,201')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await advance(page, 300);
    expect(await packets(page, 'GET /items')).toBe(1);
    await advance(page, 900); // t = 1200
    expect(await packets(page, '200 · 10,000 rows')).toBe(1);
    await expect(text(page, 'Row 1,201')).toHaveCount(0);
    await advance(page, 800); // t = 2000
    await expect(text(page, 'Row 1,201')).toBeVisible();
    await expect(text(page, '1,198 rows')).toBeVisible();
    await expect(text(page, '8,794 rows')).toBeVisible();
    await expect(text(page, 'MOUNTED')).toHaveCount(2);
    await expect(text(page, 'sent 10,000')).toBeVisible();
    await expectMetrics(page, ALL);

    // 2. Infinite scroll: pages arrive, and every one of them stays in the DOM.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      2,
      STEPS,
      'Infinite scroll pages the network, not the DOM',
      'Next: Render a window →',
    );
    await expect(text(page, 'Row 39')).toBeVisible();
    await expectMetrics(page, ['50|neutral', '300|neutral', '5 ms|neutral']);
    await advance(page, 300);
    expect(await packets(page, 'GET ?page=2')).toBe(1);
    await advance(page, 900); // t = 1200
    expect(await packets(page, '200 · 50 rows')).toBe(1);
    await advance(page, 800); // t = 2000
    await expect(text(page, 'Row 89')).toBeVisible();
    await expectMetrics(page, ['100|neutral', '600|neutral', '9 ms|neutral']);
    await advance(page, 400); // t = 2400
    expect(await packets(page, 'GET ?page=3')).toBe(1);
    await advance(page, 1700); // t = 4100
    await expect(text(page, 'Row 146')).toBeVisible();
    await expect(text(page, 'sent 150')).toBeVisible();
    await expectMetrics(page, ['150|neutral', '900|neutral', '14 ms|neutral']);

    // 3. Only a window stays mounted: the viewport and two overscan rows on each side.
    await key(page, 'ArrowRight');
    await expectStep(page, 3, STEPS, 'Render only a window', 'Next: Spacers →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'items.slice(start, end)',
    );
    await expect(text(page, 'OFF-SCREEN')).toHaveCount(2);
    await expectMetrics(page, ALL);
    await advance(page, 600);
    await expect(text(page, 'OVERSCAN')).toHaveCount(2);
    await expect(text(page, 'NO SPACER')).toHaveCount(2);
    await expectMetrics(page, WINDOW);

    // 4. Spacers stand in for the rows that are not mounted.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      4,
      STEPS,
      'Spacers keep the scrollbar honest',
      'Next: Let the browser skip →',
    );
    await expect(text(page, 'NO SPACER')).toHaveCount(2);
    await advance(page, 600);
    await expect(text(page, 'SPACER')).toHaveCount(2);
    await expect(text(page, '1,198 rows · 47,920 px')).toBeVisible();
    await expect(text(page, '8,794 rows · 351,760 px')).toBeVisible();
    await expectMetrics(page, WINDOW);

    // 5. CSS containment: every row stays, the browser skips the off-screen ones.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      5,
      STEPS,
      'Or let the browser skip the work',
      'Next: What a window costs →',
    );
    await expect.poll(() => groupOpacity(page, 'content-visibility: auto')).toBe('0');
    await expect(text(page, 'MOUNTED')).toHaveCount(2);
    await expectMetrics(page, ALL);
    await advance(page, 600);
    await expect.poll(() => groupOpacity(page, 'content-visibility: auto')).toBe('1');
    await expect(text(page, 'SKIPPED')).toHaveCount(2);
    await expectMetrics(page, ['10,000|neutral', '60,000|bad', '350 ms|neutral']);

    // 6. The costs of a window light up one by one.
    await key(page, 'ArrowRight');
    await expectStep(page, 6, STEPS, 'What a window costs', 'Next: Measure first →');
    await expect(text(page, 'SPACER')).toHaveCount(2);
    await expect.poll(() => groupOpacity(page, 'Row heights')).toBe('0');
    await advance(page, 300);
    await expect.poll(() => groupOpacity(page, 'Row heights')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'Focus')).toBe('0');
    await advance(page, 1800); // t = 2100
    for (const cost of ['Focus', 'Find in page', 'Scroll restore']) {
      await expect.poll(() => groupOpacity(page, cost)).toBe('1');
    }
    await expectMetrics(page, WINDOW);

    // 7. The verdict table, in place of the diagram.
    await key(page, 'ArrowRight');
    await expectStep(page, 7, STEPS, 'Measure first', lastStepButton('virtualization'));
    await expectVerdicts(page, 'SHOULD THIS LIST BE VIRTUALIZED?', [
      ['A paginated table, 25 rows a page', 'Render all'],
      ['A few hundred simple rows', 'Measure first'],
      ['A long page people search with Ctrl+F', 'CSS containment'],
      ['A feed that keeps loading as you scroll', 'Virtualize'],
      ['Thousands of rows on one screen', 'Virtualize'],
    ]);
    await expectMetrics(page, WINDOW);

    // And back again, one step at a time, down to the first.
    for (const title of [
      'What a window costs',
      'Or let the browser skip the work',
      'Spacers keep the scrollbar honest',
      'Render only a window',
      'Infinite scroll pages the network, not the DOM',
      'Thousands of rows, all in the DOM',
    ]) {
      await key(page, 'ArrowLeft');
      await expect(stepTitle(page)).toHaveText(title);
    }
    await expect(diagram(page)).toBeVisible();
  });

  test('the takeaways fill in as steps are reached', async ({ page }) => {
    await openFrozen(page, URL);
    const reached = () =>
      page
        .getByRole('region', { name: "You'll learn" })
        .getByRole('listitem')
        .evaluateAll((items) => items.map((li) => li.getAttribute('data-reached')));
    expect(await reached()).toEqual(['true', 'false', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'false']);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true']);
  });

  test('Space pauses and resumes, R replays', async ({ page }) => {
    await openFrozen(page, URL);
    await advance(page, 300);
    expect(await packets(page, 'GET /items')).toBe(1);
    await key(page, 'Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await advance(page, 60_000);
    await expect(text(page, 'Row 1,201')).toHaveCount(0); // nothing ran while paused
    await key(page, 'Space');
    await advance(page, 1700); // 300 had run: the 2000 frame is 1700 away
    await expect(text(page, 'Row 1,201')).toBeVisible();
    await key(page, 'r');
    await expect(text(page, 'Row 1,201')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
  });
});

test.describe('lesson 3 with reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('shows the final state of each step at once, with no packets', async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
    await expect(text(page, 'Row 1,201')).toBeVisible();
    await expectMetrics(page, ALL);
    await page.waitForTimeout(1200); // real time: a packet would have appeared by now
    expect(await packets(page, 'GET /items')).toBe(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['150|neutral', '900|neutral', '14 ms|neutral']);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    await expect(text(page, 'SPACER')).toHaveCount(2);
    await expectMetrics(page, WINDOW);
  });
});

test.describe('lesson 3 on a phone (375 px)', () => {
  test.use({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: { width: 375, height: 812 },
  });

  test('the page never scrolls sideways; the diagram scrolls inside its own box', async ({
    page,
  }) => {
    await page.goto(URL);
    await waitForHydration(page);
    for (let step = 1; step <= STEPS; step += 1) {
      if (step > 1) await key(page, 'ArrowRight');
      await expect(page.getByText(`Step ${step} of ${STEPS}`)).toBeVisible();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `step ${step}`).toBeLessThanOrEqual(375);
    }
  });
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`lesson 3, ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await storeTheme(page, theme);
    });

    test.describe('final state of every step', () => {
      test.use({ reducedMotion: 'reduce' });

      test('has no axe violations', async ({ page }) => {
        await expectEveryStepAxeClean(page, URL, STEPS);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      });
    });

    test('a packet in flight has no axe violations', async ({ page }) => {
      await expectPacketAxeClean(page, URL, 300);
    });
  });
}
