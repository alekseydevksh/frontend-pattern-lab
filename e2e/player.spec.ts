import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, storeTheme, waitForHydration } from './support';

/**
 * Plays the dummy lesson on the player test page, using only the keyboard to drive it.
 * The browser clock is frozen, so a frame fires exactly when the test says time has passed:
 * the checks below do not depend on how fast the machine is. The dummy lesson's frames
 * (see content/dev/dummy-lesson.ts), in ms from the start of step 1: 200 ping goes out,
 * 1100 pong comes back (ping is gone), 2000 answer received (pong is gone).
 */

const PAGE = '/dev/player/';
const PACKET_MS = 900;

/** Freezes the browser clock, so nothing runs until `page.clock.runFor`. Call before goto. */
async function freezeClock(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
}

const stepTitle = (page: Page) => page.getByRole('heading', { level: 2 });
const diagram = (page: Page) => page.getByRole('img');
/** Text drawn inside the diagram. */
const text = (page: Page, value: string) => diagram(page).getByText(value, { exact: true });
/** A value in the strip of three metric tiles above the diagram. */
const metric = (page: Page, value: string) =>
  page.locator('div[data-tone]').getByText(value, { exact: true });
/** How many packets with this label are drawn in the diagram right now. */
const packetCount = (page: Page, label: string) => text(page, label).count();
const animations = (page: Page) =>
  page.evaluate(() => document.getAnimations().map((a) => a.playState));

test.describe('the player test page', () => {
  test.use({ colorScheme: 'light' });

  test('plays the dummy lesson from the first step to the last with the keyboard alone', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto(PAGE);
    await waitForHydration(page);

    // First paint: the start state is all there, with no timer having run.
    await expect(stepTitle(page)).toHaveText('A message goes out');
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(diagram(page)).toHaveAccessibleName(/^A sender on the left/);
    await expect(text(page, 'Idle')).toBeVisible();
    await expect(metric(page, 'pending')).toBeVisible();
    await expect(text(page, 'RECEIVER')).toBeVisible();
    expect(await animations(page)).toEqual([]);

    // Step 1: frames run at their times, the packet appears and goes away.
    await page.clock.runFor(199);
    await expect(text(page, 'Waiting for an answer')).toHaveCount(0);
    await page.clock.runFor(1);
    await expect(text(page, 'Waiting for an answer')).toBeVisible();
    expect(await packetCount(page, 'ping')).toBe(1);
    expect(await animations(page)).toEqual(['running']);
    await page.clock.runFor(900); // t = 1100
    await expect(text(page, 'received')).toBeVisible();
    await expect(metric(page, 'received')).toBeVisible();
    expect(await packetCount(page, 'ping')).toBe(0);
    expect(await packetCount(page, 'pong')).toBe(1);
    await page.clock.runFor(900); // t = 2000
    await expect(text(page, 'Answer received')).toBeVisible();
    await expect(metric(page, 'answered')).toBeVisible();
    expect(await packetCount(page, 'pong')).toBe(0);

    // Step 2: ArrowRight. It starts from its own start state, not from where step 1 ended.
    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('Every step starts fresh');
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await expect(diagram(page)).toHaveAccessibleName(/already holds the value ready/);
    await expect(text(page, 'ready')).toBeVisible();
    await expect(metric(page, 'ready')).toBeVisible();
    await expect(text(page, 'Idle')).toBeVisible();
    await expect(metric(page, 'pending')).toBeVisible();
    await page.clock.runFor(300);
    await expect(text(page, 'Sent')).toBeVisible();
    await page.clock.runFor(600);
    await expect(text(page, 'stored')).toBeVisible();
    await expect(metric(page, 'stored')).toBeVisible();

    // Step 3: a lost packet is drawn, and the failure is also written out.
    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('A packet can be lost');
    await page.clock.runFor(200);
    expect(await packetCount(page, 'ping')).toBe(1);
    await page.clock.runFor(PACKET_MS);
    expect(await packetCount(page, 'ping')).toBe(0);
    await page.clock.runFor(300);
    await expect(text(page, 'No answer')).toBeVisible();
    await expect(metric(page, 'lost')).toBeVisible();

    // Step 4: the last step. Next becomes a restart button.
    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('That is the whole test');
    await expect(page.getByText('Step 4 of 4')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restart lesson ↺' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next:/ })).toHaveCount(0);
    await page.keyboard.press('ArrowRight'); // past the end: stays on the last step
    await expect(stepTitle(page)).toHaveText('That is the whole test');

    // And back again, one step at a time.
    await page.keyboard.press('ArrowLeft');
    await expect(stepTitle(page)).toHaveText('A packet can be lost');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(stepTitle(page)).toHaveText('A message goes out');
    await expect(text(page, 'Idle')).toBeVisible(); // back at the start of step 1, not its end
    await page.keyboard.press('ArrowLeft'); // before the start: stays on step 1
    await expect(stepTitle(page)).toHaveText('A message goes out');
  });

  test('Space pauses and resumes, and each frame still runs exactly once', async ({ page }) => {
    await freezeClock(page);
    await page.goto(PAGE);
    await waitForHydration(page);

    await page.clock.runFor(250);
    await expect(text(page, 'Waiting for an answer')).toBeVisible();
    expect(await packetCount(page, 'ping')).toBe(1);

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    expect(await animations(page)).toEqual(['paused']);
    await page.clock.runFor(60_000);
    await expect(text(page, 'received')).toHaveCount(0);
    await expect(metric(page, 'received')).toHaveCount(0);
    expect(await packetCount(page, 'ping')).toBe(1); // still in flight, not expired

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(await animations(page)).toEqual(['running']);
    // The pong frame is due at 1100 ms of the step; 250 ms had run when it was paused.
    await page.clock.runFor(849);
    await expect(text(page, 'received')).toHaveCount(0);
    await expect(metric(page, 'received')).toHaveCount(0);
    await page.clock.runFor(1);
    await expect(text(page, 'received')).toBeVisible();
    await expect(metric(page, 'received')).toBeVisible();
    expect(await packetCount(page, 'ping')).toBe(0);
    expect(await packetCount(page, 'pong')).toBe(1);
    await page.clock.runFor(60_000);
    await expect(metric(page, 'answered')).toBeVisible();
    expect(await packetCount(page, 'pong')).toBe(0);
  });

  test('R replays the step from its start state, also while paused', async ({ page }) => {
    await freezeClock(page);
    await page.goto(PAGE);
    await waitForHydration(page);

    await page.clock.runFor(1200);
    await expect(text(page, 'received')).toBeVisible();
    await expect(metric(page, 'received')).toBeVisible();
    await page.keyboard.press('r');
    await expect(text(page, 'Idle')).toBeVisible();
    await expect(metric(page, 'pending')).toBeVisible();
    expect(await packetCount(page, 'pong')).toBe(0);
    await page.clock.runFor(200);
    expect(await packetCount(page, 'ping')).toBe(1); // the frames run again, once each
    await page.clock.runFor(900);
    await expect(text(page, 'received')).toBeVisible();
    await expect(metric(page, 'received')).toBeVisible();

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await page.keyboard.press('R');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible(); // replay resumes
    await expect(text(page, 'Idle')).toBeVisible();
    await page.clock.runFor(200);
    await expect(text(page, 'Waiting for an answer')).toBeVisible();
  });

  test('Tab reaches every control in reading order, and Enter and Space work on them', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto(PAGE);
    await waitForHydration(page);

    const order = [
      'Toggle dark theme',
      'Replay',
      'Pause',
      'Step 1: A message goes out',
      'Step 2: Every step starts fresh',
      'Step 3: A packet can be lost',
      'Step 4: That is the whole test',
      'Back', // disabled on step 1, so Tab skips it: see below
    ];
    for (const name of order.slice(0, 7)) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
    }
    // Back is disabled on the first step, so the next stop is Next.
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName('Next: The answer comes back →');

    // The focused step button works with Enter and keeps focus.
    await page.getByRole('button', { name: 'Step 3: A packet can be lost' }).focus();
    await page.keyboard.press('Enter');
    await expect(stepTitle(page)).toHaveText('A packet can be lost');
    await expect(page.getByRole('button', { name: /^Step 3:/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByRole('button', { name: /^Step 1:/ })).not.toHaveAttribute(
      'aria-current',
      'step',
    );

    // Space on a focused button activates the button. It must not also pause the lesson.
    const next = page.getByRole('button', { name: 'Next: Wrap up →' });
    await next.focus();
    await page.keyboard.press('Space');
    await expect(stepTitle(page)).toHaveText('That is the whole test');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    // On the last step the same button restarts the lesson.
    const restart = page.getByRole('button', { name: 'Restart lesson ↺' });
    await restart.focus();
    await page.keyboard.press('Enter');
    await expect(stepTitle(page)).toHaveText('A message goes out');

    // The arrows still step while a button has focus.
    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('Every step starts fresh');

    // Back works with the keyboard too.
    await page.getByRole('button', { name: 'Back' }).focus();
    await page.keyboard.press('Space');
    await expect(stepTitle(page)).toHaveText('A message goes out');
  });

  test('announces the step in a polite live region, without the controls', async ({ page }) => {
    await page.goto(PAGE);
    await waitForHydration(page);
    const live = page.locator('[aria-live="polite"]');
    await expect(live).toHaveCount(1);
    await expect(live).toContainText('A message goes out');
    await expect(live.getByRole('button')).toHaveCount(0);
  });

  test('the diagram is an image whose text alternative follows the step', async ({ page }) => {
    await page.goto(PAGE);
    await waitForHydration(page);
    const labels: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      labels.push((await diagram(page).getAttribute('aria-label')) ?? '');
      await page.keyboard.press('ArrowRight');
    }
    expect(labels.every((label) => label.length > 20)).toBe(true);
    expect(new Set(labels).size).toBe(4);
  });
});

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('shows the final state of each step at once, with no packets and no animation', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await waitForHydration(page);

    await expect(text(page, 'Answer received')).toBeVisible();
    await expect(metric(page, 'answered')).toBeVisible();
    await expect(text(page, 'received')).toBeVisible();
    await expect(metric(page, 'received')).toBeVisible();
    await page.waitForTimeout(1500); // real time: a packet would have appeared by now
    expect(await packetCount(page, 'ping')).toBe(0);
    expect(await packetCount(page, 'pong')).toBe(0);
    expect(await animations(page)).toEqual([]);

    // Nothing animates, so there is nothing to pause. Replay is still there.
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Replay' })).toBeEnabled();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('Every step starts fresh');
    await expect(text(page, 'Sent')).toBeVisible();
    await expect(text(page, 'stored')).toBeVisible();
    await expect(metric(page, 'stored')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(text(page, 'No answer')).toBeVisible();
    await expect(metric(page, 'lost')).toBeVisible();
    expect(await packetCount(page, 'ping')).toBe(0);
    expect(await animations(page)).toEqual([]);

    await page.keyboard.press('r');
    await expect(text(page, 'No answer')).toBeVisible(); // replay lands on the final state again
  });
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await storeTheme(page, theme);
    });

    // axe runs on timers of its own, so the page clock must run again before it starts. Each
    // test first pauses the player, so the page stays exactly as it was meant to be checked.
    test('the start state has no axe violations', async ({ page }) => {
      await freezeClock(page);
      await page.goto(PAGE);
      await waitForHydration(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.keyboard.press('Space');
      await page.clock.resume();
      await expect(text(page, 'Idle')).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test('a packet in flight has no axe violations', async ({ page }) => {
      await freezeClock(page);
      await page.goto(PAGE);
      await waitForHydration(page);
      await page.clock.runFor(300);
      expect(await packetCount(page, 'ping')).toBe(1);
      await page.keyboard.press('Space');
      await page.clock.resume();
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
      expect(await packetCount(page, 'ping')).toBe(1); // drawn mid-lane, its animation paused
      await expectNoAxeViolations(page);
    });

    test('the last step has no axe violations', async ({ page }) => {
      await page.goto(PAGE);
      await waitForHydration(page);
      for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
      await expect(stepTitle(page)).toHaveText('That is the whole test');
      await expectNoAxeViolations(page);
    });
  });
}
