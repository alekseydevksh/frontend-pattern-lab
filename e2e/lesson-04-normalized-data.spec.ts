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
 * Lesson 4, Normalized Data, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/normalized-data.ts. The step card and
 * layout-shift checks at desktop and phone width run for every ready lesson in step-card.spec.ts
 * and layout-shift.spec.ts; the metric labels at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/normalized-data/';
const lesson = loadLesson('normalized-data');
const STEPS = 6;
/** The metrics with three copies, all in sync, before anything is renamed. */
const COPIES = ['3|bad', '3 of 3|neutral', '0|neutral'];
/** The metrics once the user is stored by id and every view is current. */
const BY_ID = ['1|good', '3 of 3|good', '0|neutral'];

const stale = (page: Parameters<typeof text>[0]) => text(page, 'STALE').count();

test.describe('lesson 4: Normalized Data', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    const run = playhead(page, lesson);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Normalized Data');
    await expect(page.getByText('04. Data and state / Lesson 4 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. Three responses, three copies of the same user.
    await expectStep(page, 1, STEPS, 'The same user, copied everywhere', 'Next: A rename →');
    await expect(diagram(page)).toHaveAccessibleName(/^Three panels side by side/);
    await expect(text(page, 'illustrative data')).toBeVisible();
    await expect(text(page, 'COPY 1')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await run.toFrame(0);
    expect(await packets(page, 'feed')).toBe(1);
    await run.toFrame(1);
    expect(await packets(page, 'profile')).toBe(1);
    await run.toFrame(2);
    expect(await packets(page, 'comments')).toBe(1);
    await run.toFrame(3);
    await expect(text(page, 'COPY 1')).toBeVisible();
    await expect(text(page, 'COPY 2')).toHaveCount(0);
    await expectMetrics(page, ['1|neutral', '1 of 3|neutral', '0|neutral']);
    await run.toFrame(4);
    await expectMetrics(page, ['2|bad', '2 of 3|neutral', '0|neutral']);
    await run.toFrame(5);
    await expect(text(page, 'COPY 3')).toBeVisible();
    await expect(text(page, 'by Mira Lund')).toHaveCount(3);
    await expectMetrics(page, COPIES);
    await expect(text(page, 'NO SHARED RECORD')).toBeVisible();

    // 2. A rename reaches one copy; the other two copies and two views are stale.
    await run.next();
    await expectStep(
      page,
      2,
      STEPS,
      'A rename reaches only one copy',
      'Next: Store each user once →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      "cache.feed[0].author.name = 'Mira Vale';",
    );
    await expect(text(page, 'no update yet')).toBeVisible();
    expect(await stale(page)).toBe(0);
    await expectMetrics(page, COPIES);
    await run.toFrame(0);
    expect(await packets(page, 'rename')).toBe(1);
    await expect(text(page, 'user u1 renamed')).toBeVisible();
    // The server has a new name; nothing in the browser has it yet.
    expect(await stale(page)).toBe(6);
    await expectMetrics(page, ['3|bad', '0 of 3|bad', '3|bad']);
    await run.toFrame(1);
    expect(await packets(page, 'name')).toBe(1);
    expect(await stale(page)).toBe(5);
    await expectMetrics(page, ['3|bad', '0 of 3|bad', '2|bad']);
    await run.toFrame(2);
    await expect(text(page, 'by Mira Vale')).toHaveCount(1);
    await expect(text(page, 'by Mira Lund')).toHaveCount(2);
    expect(await stale(page)).toBe(4); // two copies and two views
    await expectMetrics(page, ['3|bad', '1 of 3|bad', '2|bad']);

    // 3. The copies become references to one record.
    await run.next();
    await expectStep(page, 3, STEPS, 'Store each entity once, by id', 'Next: One write →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('"users"');
    expect(await groupOpacity(page, 'USERS')).toBe('0');
    expect(await groupOpacity(page, 'NO SHARED RECORD')).toBe('1');
    await expectMetrics(page, COPIES);
    await run.toFrame(0);
    await expect.poll(() => groupOpacity(page, 'USERS')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'NO SHARED RECORD')).toBe('0');
    await expect(text(page, '→ u1')).toHaveCount(3);
    await expect(text(page, '3 references')).toBeVisible();
    await expectMetrics(page, BY_ID);

    // 4. One write, and all three views follow.
    await run.next();
    await expectStep(
      page,
      4,
      STEPS,
      'One write updates every view',
      'Next: What a library leaves out →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      "store.users.u1.name = 'Mira Vale';",
    );
    await expectMetrics(page, BY_ID);
    expect(await stale(page)).toBe(0);
    await run.toFrame(0);
    expect(await packets(page, 'rename')).toBe(1);
    expect(await stale(page)).toBe(4); // the record and the three views
    await expectMetrics(page, ['1|good', '0 of 3|bad', '1|bad']);
    await run.toFrame(1);
    expect(await packets(page, 'name')).toBe(3);
    expect(await stale(page)).toBe(3);
    await expectMetrics(page, ['1|good', '0 of 3|bad', '0|good']);
    await run.toFrame(4);
    await expect(text(page, 'by Mira Vale')).toHaveCount(3);
    expect(await stale(page)).toBe(0);
    await expectMetrics(page, ['1|good', '3 of 3|good', '0|good']);

    // 5. What a query library leaves to you: the plan lights up part by part.
    await run.next();
    await expectStep(
      page,
      5,
      STEPS,
      'A query library still needs a plan',
      'Next: The test question →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('mergeUser');
    await expect(text(page, 'Same id, same record')).toBeAttached();
    await expect.poll(() => groupOpacity(page, 'Same id, same record')).toBe('0');
    await expectMetrics(page, BY_ID);
    await run.toFrame(0);
    await expect.poll(() => groupOpacity(page, 'Same id, same record')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'Merge every response')).toBe('0');
    await run.toFrame(2);
    for (const part of ['Merge every response', 'Refetch what drifts']) {
      await expect.poll(() => groupOpacity(page, part)).toBe('1');
    }
    await expectMetrics(page, BY_ID);

    // 6. The verdict table, in place of the diagram.
    await run.next();
    await expectStep(page, 6, STEPS, 'Can it appear twice?', lastStepButton('normalized-data'));
    await expectVerdicts(page, 'SHOULD THIS DATA BE NORMALIZED?', [
      ['A feed where each post shows its author', 'Normalize'],
      ['A one-off report on a single page', 'Keep nested'],
      ['People in both a roster and a chat', 'Normalize'],
      ['A settings form read by one screen', 'Keep nested'],
      ['A product in a list and on its own page', 'Normalize'],
    ]);
    await expectMetrics(page, BY_ID);

    // And back again, one step at a time, down to the first.
    for (const title of [
      'A query library still needs a plan',
      'One write updates every view',
      'Store each entity once, by id',
      'A rename reaches only one copy',
      'The same user, copied everywhere',
    ]) {
      await key(page, 'ArrowLeft');
      await expect(stepTitle(page)).toHaveText(title);
    }
    await expect(diagram(page)).toBeVisible();
  });
});
