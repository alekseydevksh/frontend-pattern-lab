import { expect, test, type Page } from '@playwright/test';
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
 * Lesson 5, Rendering Isolation, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/rendering-isolation.ts. The step card
 * and layout-shift checks at desktop and phone width run for every ready lesson in step-card.spec.ts
 * and layout-shift.spec.ts; the metric labels at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/rendering-isolation/';
const STEPS = 6;
const NONE = '—|neutral';

/** How many boxes in the tree carry this word (RENDERED, WASTED, SKIPPED) or count (×2). */
const marked = (page: Page, word: string) => text(page, word).count();
/** Opacity of a boundary (memo, contain): its label sits in a group inside the group that fades. */
const boundaryOpacity = (page: Page, label: string) =>
  text(page, label)
    .locator('xpath=../..')
    .evaluate((g) => getComputedStyle(g).opacity);

test.describe('lesson 5: Rendering Isolation', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rendering Isolation');
    await expect(page.getByText('05. Rendering and performance / Lesson 5 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. The draft lives in App: every key press renders the whole tree.
    await expectStep(
      page,
      1,
      STEPS,
      'One key press, the whole tree',
      'Next: Move the state down →',
    );
    await expect(diagram(page)).toHaveAccessibleName(/^A component tree drawn from left to right/);
    await expect(text(page, 'illustrative tree · simulated costs')).toBeVisible();
    await expect(text(page, 'state: draft')).toBeVisible();
    await expect(text(page, 'nothing changed yet')).toBeVisible();
    expect(await marked(page, '×0')).toBe(7);
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await advance(page, 300);
    expect(await packets(page, 'onChange')).toBe(1);
    await expect(text(page, 'draft: "h"')).toBeVisible();
    await advance(page, 700); // t = 1000: the second packet, from Form to App
    expect(await packets(page, 'onChange')).toBe(2);
    expect(await marked(page, 'RENDERED')).toBe(0);
    await advance(page, 900); // t = 1900
    expect(await marked(page, 'RENDERED')).toBe(3);
    expect(await marked(page, 'WASTED')).toBe(4);
    expect(await marked(page, '×1')).toBe(7);
    await expect(text(page, 'NEVER READS IT')).toBeVisible();
    await expectMetrics(page, ['7 of 7|bad', '4|bad', 'App|bad']);
    await advance(page, 400); // t = 2300: the second key press
    await expect(text(page, 'draft: "hi"')).toBeVisible();
    await advance(page, 1600); // t = 3900
    expect(await marked(page, '×2')).toBe(7);
    await expectMetrics(page, ['7 of 7|bad', '4|bad', 'App|bad']);

    // 2. The state moves down to Form: only Form, Input and Send render.
    await key(page, 'ArrowRight');
    await expectStep(page, 2, STEPS, 'Keep state next to its readers', 'Next: Split the context →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      '// in Form, moved down from App',
    );
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await advance(page, 600);
    await expect(text(page, 'STATE LIVES HERE')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'Form|neutral']);
    await advance(page, 600); // t = 1200
    expect(await packets(page, 'onChange')).toBe(1);
    await advance(page, 900); // t = 2100
    expect(await marked(page, 'RENDERED')).toBe(3);
    expect(await marked(page, 'WASTED')).toBe(0);
    expect(await marked(page, '×0')).toBe(4);
    await expectMetrics(page, ['3 of 7|good', '0|good', 'Form|good']);
    await advance(page, 1300); // t = 3400
    expect(await marked(page, '×2')).toBe(3);
    expect(await marked(page, '×0')).toBe(4);

    // 3. One context renders every reader; split by responsibility, only Header renders.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      3,
      STEPS,
      'Split a context by responsibility',
      'Next: Memoize on purpose →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'const InboxContext = createContext(unread);',
    );
    await expect.poll(() => groupOpacity(page, 'CONTEXT')).toBe('1');
    await expect(text(page, 'read by Header, Form, Messages')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'Global|neutral']);
    await advance(page, 300);
    await expect(text(page, 'unread: 3 → 4')).toBeVisible();
    await advance(page, 600); // t = 900
    expect(await marked(page, 'RENDERED')).toBe(1);
    expect(await marked(page, 'WASTED')).toBe(4);
    await expect(text(page, 'NEEDS UNREAD')).toBeVisible();
    await expectMetrics(page, ['5 of 7|bad', '4|bad', 'Global|bad']);
    await advance(page, 900); // t = 1800: the context splits
    await expect(text(page, 'read by Header')).toBeVisible();
    await expect(text(page, 'read by Form, Messages')).toBeVisible();
    expect(await marked(page, 'WASTED')).toBe(0);
    await expectMetrics(page, [NONE, NONE, 'Inbox|neutral']);
    await advance(page, 1200); // t = 3000
    await expect(text(page, 'unread: 4 → 5')).toBeVisible();
    expect(await marked(page, 'RENDERED')).toBe(1);
    expect(await marked(page, 'WASTED')).toBe(0);
    expect(await marked(page, '×2')).toBe(1);
    await expectMetrics(page, ['1 of 7|good', '0|good', 'Inbox|good']);

    // 4. A memo boundary that new props defeat, then one that skips.
    await key(page, 'ArrowRight');
    await expectStep(page, 4, STEPS, 'Memoize on purpose', 'Next: Shrink a needed render →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('useCallback');
    await expect.poll(() => boundaryOpacity(page, 'memo')).toBe('1');
    await expect(text(page, 'onReply new each time')).toBeVisible();
    await expect.poll(() => groupOpacity(page, 'CONTEXT')).toBe('0');
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await advance(page, 900);
    expect(await marked(page, 'RENDERED')).toBe(5);
    expect(await marked(page, 'WASTED')).toBe(2);
    await expectMetrics(page, ['7 of 7|bad', '2|bad', 'App|bad']);
    await advance(page, 900); // t = 1800
    await expect(text(page, 'onReply kept stable')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await advance(page, 1200); // t = 3000
    expect(await marked(page, 'SKIPPED')).toBe(2);
    expect(await marked(page, 'RENDERED')).toBe(5);
    expect(await marked(page, 'WASTED')).toBe(0);
    await expectMetrics(page, ['5 of 7|good', '0|good', 'App|good']);

    // 5. A needed render, made small: a window of rows in a contained section.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      5,
      STEPS,
      'Shrink the renders you need',
      'Next: Separation or isolation →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      "contain: 'content'",
    );
    await expect(text(page, 'state: messages')).toBeVisible();
    await expect(text(page, 'HEAVY SECTION')).toBeVisible();
    await expect(text(page, '2,000 rows · ~90 ms')).toBeVisible();
    await expect.poll(() => boundaryOpacity(page, 'contain')).toBe('0');
    await expectMetrics(page, ['2 of 7|good', '0|good', 'Thread|good']);
    await advance(page, 600);
    await expect.poll(() => boundaryOpacity(page, 'contain')).toBe('1');
    await expect(text(page, '20 of 2,000 rows')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'Thread|neutral']);
    await advance(page, 1100); // t = 1700
    await expect(text(page, 'messages: 2,002')).toBeVisible();
    await expect(text(page, '20 rows · ~4 ms')).toBeVisible();
    expect(await marked(page, '×2')).toBe(2);
    await expectMetrics(page, ['2 of 7|good', '0|good', 'Thread|good']);

    // 6. The verdict table, in place of the diagram.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      6,
      STEPS,
      'Separation is not isolation',
      lastStepButton('rendering-isolation'),
    );
    await expectVerdicts(page, 'WHAT STOPS THIS RE-RENDER?', [
      ['A field only its own form reads', 'Move state down'],
      ['Unrelated values in one context', 'Split the context'],
      ['A costly subtree with stable props', 'Memoize it'],
      ['A cheap component that renders often', 'Leave it alone'],
      ['Thousands of rows that must update', 'Window and contain'],
      ['Components split into more files', 'No runtime effect'],
    ]);
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);

    // And back again, one step at a time, down to the first.
    for (const title of [
      'Shrink the renders you need',
      'Memoize on purpose',
      'Split a context by responsibility',
      'Keep state next to its readers',
      'One key press, the whole tree',
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
    expect(await reached()).toEqual(['true', 'false', 'false', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'false', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true', 'false']);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true', 'true']);
  });

  test('Space pauses and resumes, R replays', async ({ page }) => {
    await openFrozen(page, URL);
    await advance(page, 300);
    expect(await packets(page, 'onChange')).toBe(1);
    await key(page, 'Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await advance(page, 60_000);
    expect(await marked(page, 'RENDERED')).toBe(0); // nothing ran while paused
    await key(page, 'Space');
    await advance(page, 1600); // 300 had run: the 1900 frame is 1600 away
    expect(await marked(page, 'RENDERED')).toBe(3);
    await key(page, 'r');
    expect(await marked(page, 'RENDERED')).toBe(0);
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
  });
});

test.describe('lesson 5 with reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('shows the final state of each step at once, with no packets', async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
    // The marks stay in the final state, so "what rendered" does not depend on an animation.
    expect(await marked(page, 'WASTED')).toBe(4);
    expect(await marked(page, '×2')).toBe(7);
    await expectMetrics(page, ['7 of 7|bad', '4|bad', 'App|bad']);
    await page.waitForTimeout(1200); // real time: a packet would have appeared by now
    expect(await packets(page, 'onChange')).toBe(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['3 of 7|good', '0|good', 'Form|good']);
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['1 of 7|good', '0|good', 'Inbox|good']);
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['5 of 7|good', '0|good', 'App|good']);
    expect(await marked(page, 'SKIPPED')).toBe(2);
  });
});

test.describe('lesson 5 on a phone (375 px)', () => {
  test.use({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: { width: 375, height: 812 },
  });

  test('the page never scrolls sideways and every metric value fits its tile', async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
    for (let step = 1; step <= STEPS; step += 1) {
      if (step > 1) await key(page, 'ArrowRight');
      await expect(page.getByText(`Step ${step} of ${STEPS}`)).toBeVisible();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `step ${step}`).toBeLessThanOrEqual(375);
      // A value that wrapped or stuck out would change the tile, or run into the next one.
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
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`lesson 5, ${theme} theme`, () => {
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
