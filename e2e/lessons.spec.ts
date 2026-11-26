import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, storeTheme, waitForHydration } from './support';

/**
 * Plays both ported lessons from the first step to the last, with the keyboard, against a
 * frozen browser clock, so a frame fires exactly when the test says time has passed. The
 * times, titles, button labels and metric values below are the prototype's
 * (reference/prototype.html); the frame times are in content/lessons/.
 *
 * Packets last 900 ms. A step's frames are given as "t = ms from the start of the step".
 */

const LESSON_1 = '/lessons/optimistic-ui/';
const LESSON_2 = '/lessons/push-pull-sync/';

async function open(page: Page, url: string) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(url);
  await waitForHydration(page);
}

/** Moves the frozen clock on by `ms`, and so runs the frames that are due. */
const advance = (page: Page, ms: number) => page.clock.runFor(ms);
const key = (page: Page, name: string) => page.keyboard.press(name);

const stepTitle = (page: Page) => page.getByRole('heading', { level: 2 });
const diagram = (page: Page) => page.getByRole('img');
/** Text drawn inside the diagram. */
const text = (page: Page, value: string) => diagram(page).getByText(value, { exact: true });
const packets = (page: Page, label: string) => text(page, label).count();
const nextButton = (page: Page) => page.getByRole('button', { name: /^(Next|Restart)/ });

/** The three metric tiles as "value|tone". */
const metrics = (page: Page) =>
  page
    .locator('div[data-tone]')
    .evaluateAll((tiles) =>
      tiles.map((t) => `${t.lastElementChild?.textContent}|${t.getAttribute('data-tone')}`),
    );
const expectMetrics = (page: Page, expected: string[]) =>
  expect.poll(() => metrics(page)).toEqual(expected);

/** Opacity of the group a piece of diagram text sits in: 1 shown, 0 faded out. */
const groupOpacity = (page: Page, value: string) =>
  text(page, value)
    .locator('xpath=..')
    .evaluate((g) => getComputedStyle(g).opacity);

async function expectStep(page: Page, n: number, total: number, title: string, next: string) {
  await expect(stepTitle(page)).toHaveText(title);
  await expect(page.getByText(`Step ${n} of ${total}`)).toBeVisible();
  await expect(page.getByText(`Step ${n} / ${total}`)).toBeVisible();
  await expect(nextButton(page)).toHaveAccessibleName(next);
}

test.describe('lesson 1: Optimistic UI', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    await open(page, LESSON_1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Optimistic UI');
    await expect(page.getByText('01. Data and state / Lesson 1 of 2')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. The user waits for the whole round trip.
    await expectStep(page, 1, 6, 'Waiting makes a tap feel broken', 'Next: Update first →');
    await expect(diagram(page)).toHaveAccessibleName(/^A browser panel with a Like button/);
    await expect(text(page, 'Post by Alex')).toBeVisible();
    await expect(text(page, 'Like')).toBeVisible();
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await advance(page, 299);
    await expect(text(page, 'Waiting for server…')).toHaveCount(0);
    await advance(page, 1); // t = 300
    await expect(text(page, 'Waiting for server…')).toBeVisible();
    expect(await packets(page, 'POST /like')).toBe(1);
    await advance(page, 900); // t = 1200
    expect(await packets(page, 'POST /like')).toBe(0);
    expect(await packets(page, '200 OK')).toBe(1);
    await expect(text(page, 'saved')).toBeVisible();
    await expect(text(page, 'Server answers · 600 ms')).toBeVisible();
    await expect(text(page, 'Liked')).toHaveCount(0); // the screen has not changed yet
    await advance(page, 900); // t = 2100
    await expect(text(page, 'Liked')).toBeVisible();
    await expect(text(page, 'Saved')).toBeVisible();
    await expect(text(page, 'UI changes · 600 ms')).toBeVisible();
    await expectMetrics(page, ['600 ms|neutral', '600 ms|neutral', '—|neutral']);

    // 2. The screen changes at once.
    await key(page, 'ArrowRight');
    await expectStep(page, 2, 6, 'Update first, ask later', 'Next: Server can say no →');
    await expect(text(page, 'Like')).toBeVisible(); // each step starts from its own start state
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'cache.set(post.id, withLike(post));',
    );
    await advance(page, 300);
    await expect(text(page, 'Liked')).toBeVisible();
    await expect(text(page, 'Saving in background…')).toBeVisible();
    await expectMetrics(page, ['0 ms|neutral', '—|neutral', '—|neutral']);
    await advance(page, 900);
    await expectMetrics(page, ['0 ms|neutral', '600 ms|neutral', 'no|neutral']);
    await advance(page, 900);
    await expect(text(page, 'Saved')).toBeVisible();

    // 3. The server says no: the screen is rolled back, and a toast says so.
    await key(page, 'ArrowRight');
    await expectStep(page, 3, 6, 'The server can still say no', 'Next: Keep a snapshot →');
    await expect(page.getByRole('region', { name: 'Code example' })).toHaveCount(0);
    await expect.poll(() => groupOpacity(page, 'snapshot liked=false · 128')).toBe('0');
    await advance(page, 300);
    await expect(text(page, 'Liked')).toBeVisible();
    await advance(page, 900);
    await expect(text(page, 'rejected · 403')).toBeVisible();
    expect(await packets(page, '403')).toBe(1);
    await advance(page, 900);
    await expect(text(page, 'Like')).toBeVisible();
    await expect(text(page, 'Failed. Rolled back.')).toBeVisible();
    await expect(text(page, 'Could not like. Try again.')).toBeVisible();
    await expect.poll(() => groupOpacity(page, 'Could not like. Try again.')).toBe('1');
    await expectMetrics(page, ['0 ms|neutral', '600 ms|neutral', 'yes|bad']);

    // 4. The snapshot is kept, and shown from the start.
    await key(page, 'ArrowRight');
    await expectStep(
      page,
      4,
      6,
      'Keep a snapshot for the way back',
      'Next: Where it does not belong →',
    );
    await expect.poll(() => groupOpacity(page, 'snapshot liked=false · 128')).toBe('1');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'const previous = cache.get(id);',
    );
    await advance(page, 2100);
    await expect(text(page, 'Restored from snapshot')).toBeVisible();
    await expectMetrics(page, ['0 ms|neutral', '600 ms|neutral', 'yes|bad']);

    // 5. A step that must not bet: it waits for the server.
    await key(page, 'ArrowRight');
    await expectStep(page, 5, 6, 'Not every action can bet', 'Next: A quick test →');
    await expect.poll(() => groupOpacity(page, 'snapshot liked=false · 128')).toBe('0');
    await expect(text(page, 'Contract #2041')).toBeVisible();
    await expect(text(page, 'Unsigned')).toBeVisible();
    await expect(text(page, 'Sign')).toBeVisible();
    await advance(page, 300);
    await expect(text(page, 'Signing…')).toBeVisible();
    await expect(text(page, 'Signed')).toHaveCount(0);
    await advance(page, 1800);
    await expect(text(page, 'Signed')).toBeVisible();
    await expect(text(page, 'Done')).toBeVisible();
    await expect(text(page, 'Confirmed by server')).toBeVisible();
    await expectMetrics(page, ['600 ms|neutral', '600 ms|neutral', 'n/a|neutral']);

    // 6. The summary: a verdict table in place of the diagram.
    await key(page, 'ArrowRight');
    await expectStep(page, 6, 6, 'A quick test', 'Restart lesson ↺');
    await expect(diagram(page)).toHaveCount(0);
    const table = page.getByRole('table', { name: 'IS IT SAFE TO UPDATE FIRST?' });
    await expect(table).toBeVisible();
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount(5);
    const cases: Array<[string, string]> = [
      ['Like a post', 'Optimistic'],
      ['Save an item', 'Optimistic'],
      ['Mark a notification as read', 'Optimistic'],
      ['Sign a document', 'Pending state'],
      ['Send a payment', 'Pending state'],
    ];
    for (const [i, [label, verdict]] of cases.entries()) {
      await expect(rows.nth(i).getByRole('rowheader')).toHaveText(label);
      await expect(rows.nth(i).getByRole('cell')).toHaveText(verdict);
    }
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
    await key(page, 'ArrowRight'); // past the end: stays (the next lesson comes in M4)
    await expect(stepTitle(page)).toHaveText('A quick test');

    // And back again, one step at a time, down to the first.
    for (const title of [
      'Not every action can bet',
      'Keep a snapshot for the way back',
      'The server can still say no',
      'Update first, ask later',
      'Waiting makes a tap feel broken',
    ]) {
      await key(page, 'ArrowLeft');
      await expect(stepTitle(page)).toHaveText(title);
    }
    await expect(diagram(page)).toBeVisible();
    await key(page, 'ArrowLeft'); // before the start: stays
    await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
  });

  test('the takeaways fill in as steps are reached, and stay filled when going back', async ({
    page,
  }) => {
    await open(page, LESSON_1);
    const reached = () =>
      page
        .getByRole('region', { name: "You'll learn" })
        .getByRole('listitem')
        .evaluateAll((items) => items.map((li) => li.getAttribute('data-reached')));
    expect(await reached()).toEqual(['true', 'false', 'false', 'false']);
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'false', 'false']);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'false']);
    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true']);
    for (let i = 0; i < 5; i += 1) await key(page, 'ArrowLeft');
    expect(await reached()).toEqual(['true', 'true', 'true', 'true']);
  });

  test('Tab reaches every control in reading order', async ({ page }) => {
    await open(page, LESSON_1);
    const order = [
      'Optimistic UI',
      'Push + Pull Sync',
      'Toggle dark theme',
      'Replay',
      'Pause',
      'Step 1: Waiting makes a tap feel broken',
      'Step 2: Update first, ask later',
      'Step 3: The server can still say no',
      'Step 4: Keep a snapshot for the way back',
      'Step 5: Not every action can bet',
      'Step 6: A quick test',
      // Back is disabled on the first step, so Tab skips it.
      'Next: Update first →',
    ];
    for (const name of order) {
      await key(page, 'Tab');
      // A lesson link's name starts with its number ("01 Optimistic UI"), so match the end.
      await expect(page.locator(':focus')).toHaveAccessibleName(
        new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      );
    }
    // Space on a focused button presses it; it does not also pause the lesson.
    await page.keyboard.press('Space');
    await expect(stepTitle(page)).toHaveText('Update first, ask later');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('Space pauses and resumes, R replays', async ({ page }) => {
    await open(page, LESSON_1);
    await advance(page, 300);
    expect(await packets(page, 'POST /like')).toBe(1);
    await key(page, 'Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await advance(page, 60_000);
    await expect(text(page, 'saved')).toHaveCount(0); // nothing ran while paused
    await key(page, 'Space');
    await advance(page, 900); // 300 had run: the 1200 frame is 900 away
    await expect(text(page, 'saved')).toBeVisible();
    await key(page, 'r');
    await expect(text(page, 'saved')).toHaveCount(0);
    await expectMetrics(page, ['—|neutral', '—|neutral', '—|neutral']);
  });
});

test.describe('lesson 2: Push + Pull Sync', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    await open(page, LESSON_2);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push + Pull Sync');
    await expect(page.getByText('02. Data and state / Lesson 2 of 2')).toBeVisible();
    await expect(page.getByText('7 steps')).toBeVisible();

    // 1. Pull: the first load fills the list.
    await expectStep(page, 1, 7, 'Load with a request', 'Next: Something changes →');
    await expect(diagram(page)).toHaveAccessibleName(
      /^A browser panel with an empty Documents list/,
    );
    await expect(text(page, '···')).toHaveCount(3);
    await expectMetrics(page, ['—|neutral', 'open|good', '—|neutral']);
    await advance(page, 300);
    expect(await packets(page, 'GET /documents')).toBe(1);
    await advance(page, 900);
    expect(await packets(page, '200 · 3 documents')).toBe(1);
    await expect(text(page, '···')).toHaveCount(3);
    await advance(page, 800); // t = 2000
    await expect(text(page, '···')).toHaveCount(0);
    await expect(text(page, 'pending')).toHaveCount(4);
    await expect(text(page, 'signed')).toHaveCount(2);
    await expectMetrics(page, ['in sync|good', 'open|good', '2|neutral']);

    // 2. The server changes and the browser does not know.
    await key(page, 'ArrowRight');
    await expectStep(page, 2, 7, 'Then something changes', 'Next: Push →');
    await expectMetrics(page, ['in sync|good', 'open|good', '2|neutral']);
    await advance(page, 500);
    await expect(text(page, 'signed')).toHaveCount(3);
    await expectMetrics(page, ['stale|bad', 'open|good', '2|neutral']);

    // 3. Push: an event travels from the server to the browser.
    await key(page, 'ArrowRight');
    await expectStep(page, 3, 7, 'Let the server speak up', 'Next: Give events a rule →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'DOCUMENT_SIGNED',
    );
    await expect(text(page, '↳ event: DOCUMENT_SIGNED')).toHaveCount(0);
    await advance(page, 300);
    expect(await packets(page, 'DOCUMENT_SIGNED')).toBe(1);
    await advance(page, 900);
    await expect(text(page, '↳ event: DOCUMENT_SIGNED')).toBeVisible();
    await expectMetrics(page, ['stale|bad', 'open|good', '2|neutral']);

    // 4. The event has a rule: a toast, the badge, a refetch.
    await key(page, 'ArrowRight');
    await expectStep(page, 4, 7, 'Give every event a rule', 'Next: Confirm with a request →');
    await expect(text(page, '↳ event: DOCUMENT_SIGNED')).toBeVisible();
    await expect(text(page, 'refreshing')).toHaveCount(0);
    await advance(page, 400);
    await expect(text(page, 'NDA.pdf was signed')).toBeVisible();
    await expect(text(page, 'refreshing')).toBeVisible();
    await expect(text(page, '1')).toBeVisible(); // the badge
    await expectMetrics(page, ['stale|bad', 'open|good', '1|neutral']);

    // 5. Confirm with a request: the response settles the row.
    await key(page, 'ArrowRight');
    await expectStep(page, 5, 7, 'Confirm with a request', 'Next: When the socket drops →');
    await expect(text(page, 'refreshing')).toBeVisible();
    await expect(text(page, 'NDA.pdf was signed')).toBeVisible();
    await advance(page, 300);
    expect(await packets(page, 'GET /documents/nda')).toBe(1);
    await advance(page, 900);
    expect(await packets(page, '200 · nda: signed')).toBe(1);
    await advance(page, 800);
    await expect(text(page, 'refreshing')).toHaveCount(0);
    await expect(text(page, 'NDA.pdf was signed')).toHaveCount(0);
    await expectMetrics(page, ['in sync|good', 'open|good', '1|neutral']);

    // 6. The socket drops, an event is lost, and a refetch on reconnect recovers.
    await key(page, 'ArrowRight');
    await expectStep(page, 6, 7, 'When the socket drops', 'Next: Which one does the job →');
    await expect(text(page, 'socket open')).toBeVisible();
    await advance(page, 300);
    await expect(text(page, 'socket down')).toBeVisible();
    await expectMetrics(page, ['in sync|good', 'down|bad', '1|neutral']);
    await advance(page, 700); // t = 1000
    expect(await packets(page, 'DOCUMENT_SIGNED')).toBe(1); // lost halfway, then fades
    await expectMetrics(page, ['stale|bad', 'down|bad', '1|neutral']);
    await advance(page, 900); // t = 1900
    expect(await packets(page, 'DOCUMENT_SIGNED')).toBe(0);
    await advance(page, 400); // t = 2300
    await expect(text(page, 'socket open')).toBeVisible();
    await advance(page, 400); // t = 2700
    expect(await packets(page, 'GET /documents')).toBe(1);
    await advance(page, 900); // t = 3600
    expect(await packets(page, '200 · 3 documents')).toBe(1);
    await advance(page, 800); // t = 4400
    await expect(text(page, 'signed')).toHaveCount(6);
    await expectMetrics(page, ['in sync|good', 'open|good', '0|neutral']);

    // 7. The summary: a verdict table.
    await key(page, 'ArrowRight');
    await expectStep(page, 7, 7, 'Which one does the job', 'Restart lesson ↺');
    await expect(diagram(page)).toHaveCount(0);
    const table = page.getByRole('table', { name: 'WHICH ONE DOES THE JOB?' });
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount(4);
    const cases: Array<[string, string]> = [
      ['First screen load', 'Pull'],
      ['Something changed on the server', 'Push'],
      ['Socket reconnected', 'Pull'],
      ['What is true right now?', 'Pull'],
    ];
    for (const [i, [label, verdict]] of cases.entries()) {
      await expect(rows.nth(i).getByRole('rowheader')).toHaveText(label);
      await expect(rows.nth(i).getByRole('cell')).toHaveText(verdict);
    }
    await expectMetrics(page, ['in sync|good', 'open|good', '0|neutral']);
    await key(page, 'ArrowRight');
    await expect(stepTitle(page)).toHaveText('Which one does the job');

    // The Restart button starts the lesson over.
    await nextButton(page).click();
    await expect(stepTitle(page)).toHaveText('Load with a request');
  });
});

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('lesson 1 shows the final state of each step at once, with no packets', async ({ page }) => {
    await page.goto(LESSON_1);
    await waitForHydration(page);
    await expect(text(page, 'Saved')).toBeVisible();
    await expect(text(page, 'Liked')).toBeVisible();
    await expectMetrics(page, ['600 ms|neutral', '600 ms|neutral', '—|neutral']);
    await page.waitForTimeout(1200); // real time: a packet would have appeared by now
    expect(await packets(page, 'POST /like')).toBe(0);
    expect(await packets(page, '200 OK')).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();

    await key(page, 'ArrowRight');
    await key(page, 'ArrowRight');
    await expect(text(page, 'Failed. Rolled back.')).toBeVisible();
    await expect(text(page, 'Could not like. Try again.')).toBeVisible();
    await expectMetrics(page, ['0 ms|neutral', '600 ms|neutral', 'yes|bad']);
  });

  test('lesson 2 shows the recovered state of the last diagram step at once', async ({ page }) => {
    await page.goto(LESSON_2);
    await waitForHydration(page);
    for (let i = 0; i < 5; i += 1) await key(page, 'ArrowRight');
    await expect(stepTitle(page)).toHaveText('When the socket drops');
    await expect(text(page, 'socket open')).toBeVisible();
    await expect(text(page, 'signed')).toHaveCount(6);
    await expectMetrics(page, ['in sync|good', 'open|good', '0|neutral']);
    expect(await packets(page, 'DOCUMENT_SIGNED')).toBe(0);
  });
});

for (const [name, url, steps] of [
  ['lesson 1', LESSON_1, 6],
  ['lesson 2', LESSON_2, 7],
] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${name}, ${theme} theme`, () => {
      test.beforeEach(async ({ page }) => {
        await storeTheme(page, theme);
      });

      test.describe('final state of every step', () => {
        // Reduced motion shows the whole final state of a step at once, with no timers and no
        // animation, so axe checks each step as it ends without waiting for it to play.
        test.use({ reducedMotion: 'reduce' });

        test('has no axe violations', async ({ page }) => {
          await page.goto(url);
          await waitForHydration(page);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          for (let i = 0; i < steps; i += 1) {
            if (i > 0) await key(page, 'ArrowRight');
            await expect(page.getByText(`Step ${i + 1} of ${steps}`)).toBeVisible();
            await expectNoAxeViolations(page);
          }
        });
      });

      // axe runs timers of its own, so the page clock must run again before it starts. The
      // player is paused first, so the page stays exactly as it was meant to be checked.
      test('a packet in flight has no axe violations', async ({ page }) => {
        await open(page, url);
        await advance(page, 300);
        await key(page, 'Space');
        await page.clock.resume();
        await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
        await expectNoAxeViolations(page);
      });
    });
  }
}
