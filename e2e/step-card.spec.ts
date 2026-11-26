import { expect, test, type Page } from '@playwright/test';
import { readyEntries } from '../content/lessons/catalog';
import { waitForHydration } from './support';

/**
 * "No layout shift when the step changes." The step card is as tall as the tallest step of its
 * lesson, so changing step moves nothing below it. This plays every step of every ready lesson on a
 * desktop and a phone, and checks that the things around the card stay where they are:
 *
 *  - the card itself, the Back and Next buttons in it, and the takeaways card under it;
 *  - the site footer and the height of the whole page;
 *  - the diagram card (the verdict table on the last step replaces the diagram in the same box).
 *
 * Positions are measured from the top of the document, so a scroll cannot hide a move.
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

const live = (page: Page) => page.locator('[aria-live="polite"]');

/** Top and height of an element, from the top of the document. */
async function box(page: Page, selector: ReturnType<Page['locator']>) {
  return selector.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });
}

async function measure(page: Page, lesson: string) {
  const stage = page.getByRole('region', { name: lesson, exact: true });
  return {
    stepCard: await box(page, page.getByRole('region', { name: 'Current step' })),
    back: await box(page, page.getByRole('button', { name: 'Back', exact: true })),
    takeaways: await box(page, page.getByRole('region', { name: "You'll learn" })),
    footer: await box(page, page.getByRole('contentinfo')),
    stage: await box(page, stage),
    stepper: await box(page, page.getByRole('list', { name: 'Lesson steps' })),
    pageHeight: await page.evaluate(() => document.documentElement.scrollHeight),
  };
}

/** How tall the visible step's own content is: the first child's top to the last child's bottom. */
const naturalHeight = (page: Page) =>
  live(page).evaluate((el) => {
    const first = el.firstElementChild!.getBoundingClientRect();
    const last = el.lastElementChild!.getBoundingClientRect();
    return last.bottom - first.top;
  });

for (const viewport of viewports) {
  for (const lesson of lessons) {
    test(`${lesson.name} on a ${viewport.name}: nothing around the step card moves from step to step`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // No animation to wait for: each step shows its final state at once.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(lesson.url);
      await waitForHydration(page);

      const first = await measure(page, lesson.name);
      const heights: number[] = [await naturalHeight(page)];
      const cell: number[] = [(await box(page, live(page))).height];

      for (let step = 2; step <= lesson.steps; step += 1) {
        await page.keyboard.press('ArrowRight');
        await expect(live(page)).toContainText(`Step ${step} / ${lesson.steps}`);
        const now = await measure(page, lesson.name);
        for (const key of Object.keys(first) as Array<keyof typeof first>) {
          expect(now[key], `step ${step}: ${key}`).toEqual(first[key]);
        }
        heights.push(await naturalHeight(page));
        cell.push((await box(page, live(page))).height);
      }

      // The reserve is not a guess: it is the tallest step, and not a lot more. (The step's own
      // content ends in a margin, hence the small allowance.)
      const tallest = Math.max(...heights);
      expect(new Set(cell).size, 'the cell is the same height at every step').toBe(1);
      expect(cell[0]!).toBeGreaterThanOrEqual(tallest - 1);
      expect(cell[0]!).toBeLessThanOrEqual(tallest + 24);
      // ...and at least one step is shorter than it, so the test would notice a reserve that did nothing.
      expect(Math.min(...heights)).toBeLessThan(tallest - 8);
    });
  }
}

test('the invisible copies are not on the page for a screen reader or a keyboard', async ({
  page,
}) => {
  await page.goto('/lessons/optimistic-ui/');
  await waitForHydration(page);
  const sizers = page.locator('[data-step-sizer]');
  await expect(sizers).toHaveCount(6);
  for (let i = 0; i < 6; i += 1) {
    const sizer = sizers.nth(i);
    await expect(sizer).toHaveAttribute('aria-hidden', 'true');
    await expect(sizer).toHaveAttribute('inert', '');
    await expect(sizer).toBeHidden(); // visibility: hidden
  }
  // One step heading, one live region, and only the visible step's text in it.
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(live(page)).toHaveCount(1);
  await expect(live(page)).toContainText('Waiting makes a tap feel broken');
  await expect(live(page)).not.toContainText('Update first, ask later');
  // Tab never lands inside a copy (the code block of a hidden step is not focusable).
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const inSizer = await page.evaluate(
      () => !!document.activeElement?.closest('[data-step-sizer]'),
    );
    expect(inSizer).toBe(false);
  }
});

test('the reserve is already there in the server HTML, before any script runs', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/lessons/push-pull-sync/');
  const card = await box(page, page.getByRole('region', { name: 'Current step' }));
  const cell = (await box(page, live(page))).height;
  // The visible text is short; the card holds the tallest step's room.
  expect(cell).toBeGreaterThan(await naturalHeight(page));
  expect(card.height).toBeGreaterThan(cell);
  await context.close();
});
