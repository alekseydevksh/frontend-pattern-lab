import { expect, test } from '@playwright/test';
import {
  diagram,
  expectMetrics,
  expectStep,
  expectVerdicts,
  groupOpacity,
  key,
  lastStepButton,
  loadLesson,
  openFrozen,
  packets,
  playhead,
  stepTitle,
  text,
} from './lesson-helpers';

/**
 * Lesson 3, Virtualization, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/virtualization.ts. The step card and
 * layout-shift checks at desktop and phone width run for every ready lesson in
 * step-card.spec.ts and layout-shift.spec.ts; the metric labels at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/virtualization/';
const lesson = loadLesson('virtualization');
const STEPS = 7;
/** The metrics once only the window is mounted (steps 3 to 7). */
const WINDOW = ['10,000|neutral', '48|good', '6 ms|good'];
const ALL = ['10,000|neutral', '60,000|bad', '900 ms|bad'];

test.describe('lesson 3: Virtualization', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    const run = playhead(page, lesson);
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
    await run.toFrame(0);
    expect(await packets(page, 'GET /items')).toBe(1);
    await run.toFrame(1);
    expect(await packets(page, '200 · 10,000 rows')).toBe(1);
    await expect(text(page, 'Row 1,201')).toHaveCount(0);
    await run.toFrame(2);
    await expect(text(page, 'Row 1,201')).toBeVisible();
    await expect(text(page, '1,198 rows')).toBeVisible();
    await expect(text(page, '8,794 rows')).toBeVisible();
    await expect(text(page, 'MOUNTED')).toHaveCount(2);
    await expect(text(page, 'sent 10,000')).toBeVisible();
    await expectMetrics(page, ALL);

    // 2. Infinite scroll: pages arrive, and every one of them stays in the DOM.
    await run.next();
    await expectStep(
      page,
      2,
      STEPS,
      'Infinite scroll pages the network, not the DOM',
      'Next: Render a window →',
    );
    await expect(text(page, 'Row 39')).toBeVisible();
    await expectMetrics(page, ['50|neutral', '300|neutral', '5 ms|neutral']);
    await run.toFrame(0);
    expect(await packets(page, 'GET ?page=2')).toBe(1);
    await run.toFrame(1);
    expect(await packets(page, '200 · 50 rows')).toBe(1);
    await run.toFrame(2);
    await expect(text(page, 'Row 89')).toBeVisible();
    await expectMetrics(page, ['100|neutral', '600|neutral', '9 ms|neutral']);
    await run.toFrame(3);
    expect(await packets(page, 'GET ?page=3')).toBe(1);
    await run.toFrame(5);
    await expect(text(page, 'Row 146')).toBeVisible();
    await expect(text(page, 'sent 150')).toBeVisible();
    await expectMetrics(page, ['150|neutral', '900|neutral', '14 ms|neutral']);

    // 3. Only a window stays mounted: the viewport and two overscan rows on each side.
    await run.next();
    await expectStep(page, 3, STEPS, 'Render only a window', 'Next: Spacers →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'items.slice(start, end)',
    );
    await expect(text(page, 'OFF-SCREEN')).toHaveCount(2);
    await expectMetrics(page, ALL);
    await run.toFrame(0);
    await expect(text(page, 'OVERSCAN')).toHaveCount(2);
    await expect(text(page, 'NO SPACER')).toHaveCount(2);
    await expectMetrics(page, WINDOW);

    // 4. Spacers stand in for the rows that are not mounted.
    await run.next();
    await expectStep(
      page,
      4,
      STEPS,
      'Spacers keep the scrollbar honest',
      'Next: Let the browser skip →',
    );
    await expect(text(page, 'NO SPACER')).toHaveCount(2);
    await run.toFrame(0);
    await expect(text(page, 'SPACER')).toHaveCount(2);
    await expect(text(page, '1,198 rows · 47,920 px')).toBeVisible();
    await expect(text(page, '8,794 rows · 351,760 px')).toBeVisible();
    await expectMetrics(page, WINDOW);

    // 5. CSS containment: every row stays, the browser skips the off-screen ones.
    await run.next();
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
    await run.toFrame(0);
    await expect.poll(() => groupOpacity(page, 'content-visibility: auto')).toBe('1');
    await expect(text(page, 'SKIPPED')).toHaveCount(2);
    await expectMetrics(page, ['10,000|neutral', '60,000|bad', '350 ms|neutral']);

    // 6. The costs of a window light up one by one.
    await run.next();
    await expectStep(page, 6, STEPS, 'What a window costs', 'Next: Measure first →');
    await expect(text(page, 'SPACER')).toHaveCount(2);
    await expect.poll(() => groupOpacity(page, 'Row heights')).toBe('0');
    await run.toFrame(0);
    await expect.poll(() => groupOpacity(page, 'Row heights')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'Focus')).toBe('0');
    await run.toFrame(3);
    for (const cost of ['Focus', 'Find in page', 'Scroll restore']) {
      await expect.poll(() => groupOpacity(page, cost)).toBe('1');
    }
    await expectMetrics(page, WINDOW);

    // 7. The verdict table, in place of the diagram.
    await run.next();
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
});
