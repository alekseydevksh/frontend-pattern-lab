import { expect, test, type Page } from '@playwright/test';
import { readyEntries } from '../content/lessons/catalog';
import { waitForHydration } from './support';

/**
 * "No layout shift while a lesson plays" (docs/SPEC.md, success criteria). Lighthouse measures
 * the page load only, so this plays every step of every ready lesson in real time, with the browser's
 * own layout-shift observer running from before the page loads, and requires a total of exactly 0.
 *
 * Two totals are kept. The standard one ignores shifts within 500 ms of a key press or click, as
 * the CLS metric does, and must be exactly 0. The strict one counts every shift, including the
 * ones a step change causes; it is only reported. Since the step card keeps the height of its
 * tallest step (D14) nothing around the card moves on a step change (e2e/step-card.spec.ts checks
 * that); what is left in the strict total is the new step's text replacing the old inside the card
 * (0.00 to 0.01), where it was 0.06 to 0.08 before.
 */

/** Every ready lesson in the catalog, so a new lesson is covered the day it is added. */
const lessons = readyEntries.map((entry) => ({
  name: entry.title,
  url: `/lessons/${entry.slug}/`,
  steps: entry.stepCount,
}));
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];
/** The longest step plays for about 2.2 s (its last frame, plus a packet in flight). */
const STEP_MS = 2400;

async function startObserving(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __clsStrict: number };
    w.__cls = 0;
    w.__clsStrict = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>) {
        w.__clsStrict += entry.value;
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const shifts = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __cls: number; __clsStrict: number };
    return { cls: w.__cls, strict: w.__clsStrict };
  });

for (const viewport of viewports) {
  for (const lesson of lessons) {
    test(`${lesson.name} plays on a ${viewport.name} without a layout shift`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await startObserving(page);
      await page.goto(lesson.url);
      await waitForHydration(page);

      for (let step = 1; step <= lesson.steps; step += 1) {
        // Let the step play out, with the learner doing nothing: this is the time that counts.
        await page.waitForTimeout(STEP_MS);
        if (step < lesson.steps) await page.keyboard.press('ArrowRight');
      }
      await page.waitForTimeout(600); // a shift can be reported a moment after it happens

      const { cls, strict } = await shifts(page);
      console.log(`${lesson.name} (${viewport.name}): CLS ${cls}, counting step changes ${strict}`);
      expect(cls).toBe(0);
    });
  }
}
