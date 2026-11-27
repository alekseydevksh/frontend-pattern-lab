import { expect, test, type Page } from '@playwright/test';
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
 * Lesson 5, Rendering Isolation, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/rendering-isolation.ts. The step card
 * and layout-shift checks at desktop and phone width run for every ready lesson in step-card.spec.ts
 * and layout-shift.spec.ts; the metric labels and values at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/rendering-isolation/';
const lesson = loadLesson('rendering-isolation');
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
    const run = playhead(page, lesson);
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
    await run.toFrame(0);
    expect(await packets(page, 'onChange')).toBe(1);
    await expect(text(page, 'draft: "h"')).toBeVisible();
    await run.toFrame(1); // the second packet, from Form to App
    expect(await packets(page, 'onChange')).toBe(2);
    expect(await marked(page, 'RENDERED')).toBe(0);
    await run.toFrame(2);
    expect(await marked(page, 'RENDERED')).toBe(3);
    expect(await marked(page, 'WASTED')).toBe(4);
    expect(await marked(page, '×1')).toBe(7);
    await expect(text(page, 'NEVER READS IT')).toBeVisible();
    await expectMetrics(page, ['7 of 7|bad', '4|bad', 'App|bad']);
    await run.toFrame(3); // the second key press
    await expect(text(page, 'draft: "hi"')).toBeVisible();
    await run.toFrame(5);
    expect(await marked(page, '×2')).toBe(7);
    await expectMetrics(page, ['7 of 7|bad', '4|bad', 'App|bad']);

    // 2. The state moves down to Form: only Form, Input and Send render.
    await run.next();
    await expectStep(page, 2, STEPS, 'Keep state next to its readers', 'Next: Split the context →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      '// in Form, moved down from App',
    );
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await run.toFrame(0);
    await expect(text(page, 'STATE LIVES HERE')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'Form|neutral']);
    await run.toFrame(1);
    expect(await packets(page, 'onChange')).toBe(1);
    await run.toFrame(2);
    expect(await marked(page, 'RENDERED')).toBe(3);
    expect(await marked(page, 'WASTED')).toBe(0);
    expect(await marked(page, '×0')).toBe(4);
    await expectMetrics(page, ['3 of 7|good', '0|good', 'Form|good']);
    await run.toFrame(4);
    expect(await marked(page, '×2')).toBe(3);
    expect(await marked(page, '×0')).toBe(4);

    // 3. One context renders every reader; split by responsibility, only Header renders.
    await run.next();
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
    await run.toFrame(0);
    await expect(text(page, 'unread: 3 → 4')).toBeVisible();
    await run.toFrame(1);
    expect(await marked(page, 'RENDERED')).toBe(1);
    expect(await marked(page, 'WASTED')).toBe(4);
    await expect(text(page, 'NEEDS UNREAD')).toBeVisible();
    await expectMetrics(page, ['5 of 7|bad', '4|bad', 'Global|bad']);
    await run.toFrame(2); // the context splits
    await expect(text(page, 'read by Header')).toBeVisible();
    await expect(text(page, 'read by Form, Messages')).toBeVisible();
    expect(await marked(page, 'WASTED')).toBe(0);
    await expectMetrics(page, [NONE, NONE, 'Inbox|neutral']);
    await run.toFrame(4);
    await expect(text(page, 'unread: 4 → 5')).toBeVisible();
    expect(await marked(page, 'RENDERED')).toBe(1);
    expect(await marked(page, 'WASTED')).toBe(0);
    expect(await marked(page, '×2')).toBe(1);
    await expectMetrics(page, ['1 of 7|good', '0|good', 'Inbox|good']);

    // 4. A memo boundary that new props defeat, then one that skips.
    await run.next();
    await expectStep(page, 4, STEPS, 'Memoize on purpose', 'Next: Shrink a needed render →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('useCallback');
    await expect.poll(() => boundaryOpacity(page, 'memo')).toBe('1');
    await expect(text(page, 'onReply new each time')).toBeVisible();
    await expect.poll(() => groupOpacity(page, 'CONTEXT')).toBe('0');
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await run.toFrame(1);
    expect(await marked(page, 'RENDERED')).toBe(5);
    expect(await marked(page, 'WASTED')).toBe(2);
    await expectMetrics(page, ['7 of 7|bad', '2|bad', 'App|bad']);
    await run.toFrame(2);
    await expect(text(page, 'onReply kept stable')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'App|neutral']);
    await run.toFrame(4);
    expect(await marked(page, 'SKIPPED')).toBe(2);
    expect(await marked(page, 'RENDERED')).toBe(5);
    expect(await marked(page, 'WASTED')).toBe(0);
    await expectMetrics(page, ['5 of 7|good', '0|good', 'App|good']);

    // 5. A needed render, made small: a window of rows in a contained section.
    await run.next();
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
    await run.toFrame(0);
    await expect.poll(() => boundaryOpacity(page, 'contain')).toBe('1');
    await expect(text(page, '20 of 2,000 rows')).toBeVisible();
    await expectMetrics(page, [NONE, NONE, 'Thread|neutral']);
    await run.toFrame(2);
    await expect(text(page, 'messages: 2,002')).toBeVisible();
    await expect(text(page, '20 rows · ~4 ms')).toBeVisible();
    expect(await marked(page, '×2')).toBe(2);
    await expectMetrics(page, ['2 of 7|good', '0|good', 'Thread|good']);

    // 6. The verdict table, in place of the diagram.
    await run.next();
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
});
