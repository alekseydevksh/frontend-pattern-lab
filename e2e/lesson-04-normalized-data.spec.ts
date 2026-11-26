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
 * Lesson 4, Normalized Data, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/normalized-data.ts. The step card and
 * layout-shift checks at desktop and phone width run for every ready lesson in step-card.spec.ts
 * and layout-shift.spec.ts; the metric labels at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/normalized-data/';
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Normalized Data');
    await expect(page.getByText('04. Data and state / Lesson 4 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. Three responses, three copies of the same user.
    await expectStep(page, 1, STEPS, 'The same user, copied everywhere', 'Next: A rename →');
    await expect(diagram(page)).toHaveAccessibleName(/^Three panels side by side/);
    await expect(text(page, 'illustrative data')).toBeVisible();
    await expect(text(page, 'COPY 1')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await advance(page, 300);
    expect(await packets(page, 'feed')).toBe(1);
    await advance(page, 400); // t = 700
    expect(await packets(page, 'profile')).toBe(1);
    await advance(page, 400); // t = 1100
    expect(await packets(page, 'comments')).toBe(1);
    await advance(page, 100); // t = 1200
    await expect(text(page, 'COPY 1')).toBeVisible();
    await expect(text(page, 'COPY 2')).toHaveCount(0);
    await expectMetrics(page, ['1|neutral', '1 of 3|neutral', '0|neutral']);
    await advance(page, 400); // t = 1600
    await expectMetrics(page, ['2|bad', '2 of 3|neutral', '0|neutral']);
    await advance(page, 400); // t = 2000
    await expect(text(page, 'COPY 3')).toBeVisible();
    await expect(text(page, 'by Mira Lund')).toHaveCount(3);
    await expectMetrics(page, COPIES);
    await expect(text(page, 'NO SHARED RECORD')).toBeVisible();

    // 2. A rename reaches one copy; the other two copies and two views are stale.
    await key(page, 'ArrowRight');
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
    await advance(page, 300);
    expect(await packets(page, 'rename')).toBe(1);
    await expect(text(page, 'user u1 renamed')).toBeVisible();
    // The server has a new name; nothing in the browser has it yet.
    expect(await stale(page)).toBe(6);
    await expectMetrics(page, ['3|bad', '0 of 3|bad', '3|bad']);
    await advance(page, 900); // t = 1200
    expect(await packets(page, 'name')).toBe(1);
    expect(await stale(page)).toBe(5);
    await expectMetrics(page, ['3|bad', '0 of 3|bad', '2|bad']);
    await advance(page, 900); // t = 2100
    await expect(text(page, 'by Mira Vale')).toHaveCount(1);
    await expect(text(page, 'by Mira Lund')).toHaveCount(2);
    expect(await stale(page)).toBe(4); // two copies and two views
    await expectMetrics(page, ['3|bad', '1 of 3|bad', '2|bad']);

    // 3. The copies become references to one record.
    await key(page, 'ArrowRight');
    await expectStep(page, 3, STEPS, 'Store each entity once, by id', 'Next: One write →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('"users"');
    expect(await groupOpacity(page, 'USERS')).toBe('0');
    expect(await groupOpacity(page, 'NO SHARED RECORD')).toBe('1');
    await expectMetrics(page, COPIES);
    await advance(page, 600);
    await expect.poll(() => groupOpacity(page, 'USERS')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'NO SHARED RECORD')).toBe('0');
    await expect(text(page, '→ u1')).toHaveCount(3);
    await expect(text(page, '3 references')).toBeVisible();
    await expectMetrics(page, BY_ID);

    // 4. One write, and all three views follow.
    await key(page, 'ArrowRight');
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
    await advance(page, 300);
    expect(await packets(page, 'rename')).toBe(1);
    expect(await stale(page)).toBe(4); // the record and the three views
    await expectMetrics(page, ['1|good', '0 of 3|bad', '1|bad']);
    await advance(page, 900); // t = 1200
    expect(await packets(page, 'name')).toBe(3);
    expect(await stale(page)).toBe(3);
    await expectMetrics(page, ['1|good', '0 of 3|bad', '0|good']);
    await advance(page, 900); // t = 2100
    await expect(text(page, 'by Mira Vale')).toHaveCount(3);
    expect(await stale(page)).toBe(0);
    await expectMetrics(page, ['1|good', '3 of 3|good', '0|good']);

    // 5. What a query library leaves to you: the plan lights up part by part.
    await key(page, 'ArrowRight');
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
    await advance(page, 300);
    await expect.poll(() => groupOpacity(page, 'Same id, same record')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'Merge every response')).toBe('0');
    await advance(page, 1200); // t = 1500
    for (const part of ['Merge every response', 'Refetch what drifts']) {
      await expect.poll(() => groupOpacity(page, part)).toBe('1');
    }
    await expectMetrics(page, BY_ID);

    // 6. The verdict table, in place of the diagram.
    await key(page, 'ArrowRight');
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
    expect(await packets(page, 'feed')).toBe(1);
    await key(page, 'Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await advance(page, 60_000);
    await expect(text(page, 'COPY 1')).toHaveCount(0); // nothing ran while paused
    await key(page, 'Space');
    await advance(page, 900); // 300 had run: the 1200 frame is 900 away
    await expect(text(page, 'COPY 1')).toBeVisible();
    await key(page, 'r');
    await expect(text(page, 'COPY 1')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
  });
});

test.describe('lesson 4 with reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('shows the final state of each step at once, with no packets', async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
    await expect(text(page, 'COPY 3')).toBeVisible();
    await expectMetrics(page, COPIES);
    await page.waitForTimeout(1200); // real time: a packet would have appeared by now
    expect(await packets(page, 'feed')).toBe(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['3|bad', '1 of 3|bad', '2|bad']);
    expect(await stale(page)).toBe(4);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    await expectMetrics(page, ['1|good', '3 of 3|good', '0|good']);
    expect(await stale(page)).toBe(0);
  });
});

test.describe('lesson 4 on a phone (375 px)', () => {
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
  test.describe(`lesson 4, ${theme} theme`, () => {
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
