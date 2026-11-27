import { expect, test, type Page } from '@playwright/test';
import { readyEntries } from '../content/lessons/catalog';
import {
  advance,
  diagram,
  expectEveryStepAxeClean,
  expectPacketAxeClean,
  firstPacket,
  frameTimes,
  key,
  loadLesson,
  markup,
  openFrozen,
  playTime,
  takeawaysReached,
} from './lesson-helpers';
import { storeTheme, waitForHydration } from './support';

/**
 * The checks every lesson has to pass, run for each ready lesson in the catalog and fed by its data
 * (`content/lessons/<slug>.ts`), so a new lesson is covered the day its catalog entry is ready and
 * its spec has to repeat none of this: the takeaways, Space and R, reduced motion, the phone, and
 * axe in both themes. A lesson's own spec, `e2e/lesson-NN-<slug>.spec.ts`, plays the lesson step by
 * step. What each check expects is read from the data: the takeaways from each step's
 * `takeawayIndex`, the times from the frames, the packet to check axe on from the first frame that
 * sends one. To run one lesson's: `playwright test e2e/lesson-shared.spec.ts -g "for <slug>\b"`.
 */

const PHONE = 375;

type StepData = ReturnType<typeof loadLesson>['steps'][number];

/** The picture a step shows: its diagram, or its verdict table. Compared as markup. */
const picture = (page: Page, step: StepData) =>
  markup(step.summary ? page.getByRole('table') : diagram(page));

/** The packets in flight: the marks in the packet layer, the last group of the diagram's SVG. */
const packetsInFlight = (page: Page) =>
  diagram(page).locator(':scope > g[aria-hidden="true"]:last-child > g').count();

const takeawayState = (page: Page) =>
  page
    .getByRole('region', { name: "You'll learn" })
    .getByRole('listitem')
    .evaluateAll((items) => items.map((li) => li.getAttribute('data-reached') === 'true'));

for (const entry of readyEntries) {
  const lesson = loadLesson(entry.slug);
  const url = `/lessons/${lesson.slug}/`;
  const steps = lesson.steps.length;

  test.describe(`shared checks for ${lesson.slug}`, () => {
    test.use({ colorScheme: 'light' });

    test('the takeaways fill in as steps are reached', async ({ page }) => {
      await openFrozen(page, url);
      for (let i = 0; i < steps; i += 1) {
        if (i > 0) await key(page, 'ArrowRight');
        expect(await takeawayState(page), `step ${i + 1} of ${steps}`).toEqual(
          takeawaysReached(lesson, i),
        );
      }
    });

    test('Space pauses and resumes, R replays', async ({ page }) => {
      // Step 1: pause after its first frame, if it has a later one to hold back.
      const times = frameTimes(lesson.steps[0]!);
      const pauseAt = times.length >= 2 ? times[0]! : 0;
      const end = playTime(lesson.steps[0]!);
      expect(end, 'step 1 needs frames to pause between').toBeGreaterThan(pauseAt);

      await openFrozen(page, url);
      const start = await markup(diagram(page));
      await advance(page, pauseAt);
      const held = await markup(diagram(page));
      await key(page, 'Space');
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
      await advance(page, 60_000);
      expect(await markup(diagram(page)), 'nothing runs while paused').toBe(held);
      await key(page, 'Space');
      await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
      await advance(page, end - pauseAt); // what was left of the step when it was paused
      expect(await markup(diagram(page)), 'the step plays on after a resume').not.toBe(held);
      expect(await packetsInFlight(page), 'every packet has landed').toBe(0);
      const played = await markup(diagram(page));
      await key(page, 'r');
      expect(await markup(diagram(page)), 'R starts the step again').toBe(start);
      await advance(page, end);
      expect(await markup(diagram(page)), 'and it plays the same way').toBe(played);
    });

    test('with reduced motion every step shows what a full play ends in, at once', async ({
      browser,
      page,
      baseURL,
    }) => {
      test.setTimeout(90_000);
      // The final picture of each step, from playing the lesson with the clock frozen.
      await openFrozen(page, url);
      const played: string[] = [];
      for (const [i, step] of lesson.steps.entries()) {
        if (i > 0) await key(page, 'ArrowRight');
        await advance(page, playTime(step));
        played.push(await picture(page, step));
      }

      const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
      const reduced = await context.newPage();
      await reduced.goto(url);
      await waitForHydration(reduced);
      await expect(reduced.getByRole('button', { name: 'Pause' })).toBeDisabled();
      for (const [i, step] of lesson.steps.entries()) {
        if (i > 0) await key(reduced, 'ArrowRight');
        await expect(reduced.getByText(`Step ${i + 1} of ${steps}`)).toBeVisible();
        if (!step.summary) expect(await packetsInFlight(reduced), `step ${i + 1}`).toBe(0);
        expect(await picture(reduced, step), `step ${i + 1} of ${steps}`).toBe(played[i]);
        if (i === 0 && step.frames.length > 0) {
          await reduced.waitForTimeout(1200); // real time: a packet would have left by now
          expect(await picture(reduced, step), 'nothing moves later').toBe(played[0]);
        }
      }
      await context.close();
    });
  });

  test.describe(`shared checks for ${lesson.slug} on a phone`, () => {
    test.use({
      colorScheme: 'light',
      reducedMotion: 'reduce',
      viewport: { width: PHONE, height: 812 },
    });

    test('the page never scrolls sideways', async ({ page }) => {
      await page.goto(url);
      await waitForHydration(page);
      for (let step = 1; step <= steps; step += 1) {
        if (step > 1) await key(page, 'ArrowRight');
        await expect(page.getByText(`Step ${step} of ${steps}`)).toBeVisible();
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(width, `step ${step}`).toBeLessThanOrEqual(PHONE);
      }
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test.describe(`shared checks for ${lesson.slug}, ${theme} theme`, () => {
      test.beforeEach(async ({ page }) => {
        await storeTheme(page, theme);
      });

      test.describe('final state of every step', () => {
        test.use({ reducedMotion: 'reduce' });

        test('has no axe violations', async ({ page }) => {
          test.setTimeout(90_000);
          await expectEveryStepAxeClean(page, url, steps);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        });
      });

      test('a packet in flight has no axe violations', async ({ page }) => {
        const packet = firstPacket(lesson);
        expect(packet, 'the lesson sends no packet at all').toBeDefined();
        await expectPacketAxeClean(page, url, packet!.at, packet!.step);
      });
    });
  }
}
