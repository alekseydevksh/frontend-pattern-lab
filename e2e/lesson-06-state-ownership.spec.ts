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
 * Lesson 6, State Ownership, played from the first step to the last with the keyboard alone,
 * against a frozen clock. Frame times are in content/lessons/state-ownership.ts. The step card and
 * layout-shift checks at desktop and phone width run for every ready lesson in step-card.spec.ts and
 * layout-shift.spec.ts; the metric labels and values at 375 px in metric-labels.spec.ts.
 */

const URL = '/lessons/state-ownership/';
const STEPS = 6;
const NONE = '—|neutral';
const UNSORTED = ['0 of 5|bad', '8|bad'];
const SORTED = ['5 of 5|good', '0|good'];

/** How many stations or chips carry this word or value. */
const marked = (page: Page, word: string) => text(page, word).count();
/** How many item chips still sit in the global store. */
const inStore = (page: Page) => diagram(page).locator('[data-home="store"]').count();
/** Opacity of a piece of diagram text that fades on its own (the store's notes). */
const ownOpacity = (page: Page, value: string) =>
  text(page, value).evaluate((t) => getComputedStyle(t).opacity);

test.describe('lesson 6: State Ownership', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('State Ownership');
    await expect(page.getByText('06. Data and state / Lesson 6 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. One global store holds everything; the filter has two owners and the update loops back.
    await expectStep(
      page,
      1,
      STEPS,
      'Everything in one global store',
      'Next: Five kinds of state →',
    );
    await expect(diagram(page)).toHaveAccessibleName(/^At the top, one global store holds eight/);
    await expect(text(page, 'illustrative page · simulated hops')).toBeVisible();
    await expect.poll(() => ownOpacity(page, 'NO SINGLE OWNER')).toBe('1');
    expect(await inStore(page)).toBe(8);
    await expect(text(page, 'filter: all')).toBeVisible();
    await expectMetrics(page, [...UNSORTED, NONE]);
    await advance(page, 300);
    expect(await packets(page, 'setFilter')).toBe(1);
    await advance(page, 900); // t = 1200: the store has the new filter, the URL does not
    await expect(text(page, 'filter: new')).toBeVisible();
    expect(await marked(page, 'OUT OF SYNC')).toBe(2);
    await expectMetrics(page, [...UNSORTED, '1 hop|bad']);
    await advance(page, 300); // t = 1500
    expect(await packets(page, 'sync URL')).toBe(1);
    await advance(page, 900); // t = 2400: the copies agree, and both claim the value
    await expect(text(page, '?filter=new')).toBeVisible();
    expect(await marked(page, 'OUT OF SYNC')).toBe(0);
    expect(await marked(page, 'TWO OWNERS')).toBe(2);
    await expectMetrics(page, [...UNSORTED, '2 hops|bad']);
    await advance(page, 300); // t = 2700
    expect(await packets(page, 'sync back')).toBe(1);
    await advance(page, 900); // t = 3600
    await expect(text(page, 'copies back')).toBeVisible();
    await expectMetrics(page, [...UNSORTED, '3 hops|bad']);
    await advance(page, 300); // t = 3900
    expect(await packets(page, 'render')).toBe(1);
    await advance(page, 900); // t = 4800
    await expect(text(page, 'list: new')).toBeVisible();
    expect(await marked(page, 'REACHED')).toBe(2);
    await expectMetrics(page, [...UNSORTED, '4 hops|bad']);

    // 2. The items sort into their five homes, one by one.
    await key(page, 'ArrowRight');
    await expectStep(page, 2, STEPS, 'Five kinds, five homes', 'Next: What each home promises →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText("filter: 'url'");
    await expect(text(page, 'no update yet')).toBeVisible();
    await expectMetrics(page, [...UNSORTED, NONE]);
    await advance(page, 400);
    expect(await inStore(page)).toBe(7);
    await expectMetrics(page, ['1 of 5|bad', '7|bad', NONE]);
    await advance(page, 1200); // t = 1600: offers, profile, modal and draft have moved
    expect(await inStore(page)).toBe(4);
    await expectMetrics(page, ['2 of 5|bad', '4|bad', NONE]);
    await advance(page, 1600); // t = 3200
    expect(await inStore(page)).toBe(0);
    await expectMetrics(page, [...SORTED, NONE]);
    await expect.poll(() => ownOpacity(page, 'NO SINGLE OWNER')).toBe('0');
    await expect.poll(() => ownOpacity(page, 'empty: every item has one home')).toBe('1');

    // 3. Each home's promise appears.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      3,
      STEPS,
      'Each home keeps a different promise',
      'Next: Choose the tool last →',
    );
    await expectMetrics(page, [...SORTED, NONE]);
    await expect.poll(() => groupOpacity(page, 'cached, refetched')).toBe('0');
    await advance(page, 500);
    await expect.poll(() => groupOpacity(page, 'cached, refetched')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'instant')).toBe('0');
    await advance(page, 2000); // t = 2500
    await expect.poll(() => groupOpacity(page, 'resumes on drop')).toBe('1');

    // 4. A tool for each home, chosen after the kind.
    await key(page, 'ArrowRight');
    await expectStep(page, 4, STEPS, 'Choose the tool last', 'Next: One direction →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      "useSearchParam('filter')",
    );
    await expect.poll(() => groupOpacity(page, 'shareable link')).toBe('1');
    await expect.poll(() => groupOpacity(page, 'request cache')).toBe('0');
    await advance(page, 500);
    await expect.poll(() => groupOpacity(page, 'request cache')).toBe('1');
    await advance(page, 2000); // t = 2500
    await expect.poll(() => groupOpacity(page, 'subscription')).toBe('1');
    await expectMetrics(page, [...SORTED, NONE]);

    // 5. One direction: action, handler, owner, screen.
    await key(page, 'ArrowRight');
    await expectStep(page, 5, STEPS, 'Let updates travel one way', 'Next: Where does it live? →');
    await expect(text(page, 'OWNER: URL')).toBeVisible();
    await expect(text(page, 'onFilter')).toBeVisible();
    await expectMetrics(page, [...SORTED, NONE]);
    await advance(page, 300);
    expect(await packets(page, 'click')).toBe(1);
    await advance(page, 900); // t = 1200
    expect(await marked(page, 'REACHED')).toBe(2);
    await expectMetrics(page, [...SORTED, '1 hop|good']);
    await advance(page, 300); // t = 1500
    expect(await packets(page, 'setParam')).toBe(1);
    await advance(page, 900); // t = 2400: the URL, the filter's only owner, changes
    await expect(text(page, '?filter=new')).toBeVisible();
    await expect(text(page, 'filter: new')).toBeVisible();
    await expectMetrics(page, [...SORTED, '2 hops|good']);
    await advance(page, 300); // t = 2700
    expect(await packets(page, 'render')).toBe(1);
    await advance(page, 900); // t = 3600
    expect(await marked(page, 'REACHED')).toBe(4);
    expect(await marked(page, 'copies back')).toBe(0);
    expect(await marked(page, 'TWO OWNERS')).toBe(0);
    await expectMetrics(page, [...SORTED, '3 hops|good']);

    // 6. The verdict table, in place of the diagram.
    await key(page, 'ArrowRight');
    await expectStep(page, 6, STEPS, 'Where does it live?', lastStepButton('state-ownership'));
    await expectVerdicts(page, 'WHERE DOES IT LIVE?', [
      ['A filter on a search page', 'The URL'],
      ['Whether a modal is open', 'Client UI state'],
      ['A list of offers from the API', 'Server cache'],
      ['The chosen colour theme', 'Persistent storage'],
      ['A background job that just finished', 'Event, then refetch'],
      ['A total computed from the list', 'Derive it, no home'],
    ]);
    await expectMetrics(page, [...SORTED, NONE]);

    // And back again, one step at a time, down to the first.
    for (const title of [
      'Let updates travel one way',
      'Choose the tool last',
      'Each home keeps a different promise',
      'Five kinds, five homes',
      'Everything in one global store',
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
    expect(await reached()).toEqual(['true', 'true', 'true', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true', 'true']);
  });

  test('Space pauses and resumes, R replays', async ({ page }) => {
    await openFrozen(page, URL);
    await advance(page, 300);
    expect(await packets(page, 'setFilter')).toBe(1);
    await key(page, 'Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await advance(page, 60_000);
    expect(await marked(page, 'OUT OF SYNC')).toBe(0); // nothing ran while paused
    await key(page, 'Space');
    await advance(page, 900); // 300 had run: the 1200 frame is 900 away
    expect(await marked(page, 'OUT OF SYNC')).toBe(2);
    await key(page, 'r');
    expect(await marked(page, 'OUT OF SYNC')).toBe(0);
    await expectMetrics(page, [...UNSORTED, NONE]);
  });
});

test.describe('lesson 6 with reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('shows the final state of each step at once, with no packets', async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
    // The station marks and hop arrows stay, so the loop does not depend on an animation.
    expect(await marked(page, 'TWO OWNERS')).toBe(2);
    await expect(text(page, 'copies back')).toBeVisible();
    await expectMetrics(page, [...UNSORTED, '4 hops|bad']);
    await page.waitForTimeout(1200); // real time: a packet would have appeared by now
    expect(await packets(page, 'setFilter')).toBe(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
    await key(page, 'ArrowRight');
    expect(await inStore(page)).toBe(0);
    await expectMetrics(page, [...SORTED, NONE]);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    expect(await marked(page, 'REACHED')).toBe(4);
    await expectMetrics(page, [...SORTED, '3 hops|good']);
  });
});

test.describe('lesson 6 on a phone (375 px)', () => {
  test.use({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: { width: 375, height: 812 },
  });

  test('the page never scrolls sideways', async ({ page }) => {
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
  test.describe(`lesson 6, ${theme} theme`, () => {
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
