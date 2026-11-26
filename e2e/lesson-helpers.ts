import { expect, type Page } from '@playwright/test';
import { nextLessonAfter } from '../content/lessons/catalog';
import { expectNoAxeViolations, waitForHydration } from './support';

/**
 * Helpers for the end-to-end test of one lesson (`e2e/lesson-NN-<slug>.spec.ts`, from lesson 3 on).
 * A lesson is played against a frozen browser clock, so a frame fires exactly when the test says
 * time has passed. Packets last 900 ms.
 */

/** Opens a lesson with the clock frozen at 0. */
export async function openFrozen(page: Page, url: string) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(url);
  await waitForHydration(page);
}

/** Moves the frozen clock on by `ms`, and so runs the frames that are due. */
export const advance = (page: Page, ms: number) => page.clock.runFor(ms);
export const key = (page: Page, name: string) => page.keyboard.press(name);

export const stepTitle = (page: Page) => page.getByRole('heading', { level: 2 });
export const diagram = (page: Page) => page.getByRole('img');
/** Text drawn inside the diagram (including text in a group that is faded out). */
export const text = (page: Page, value: string) => diagram(page).getByText(value, { exact: true });
/** How many packets with this label are in flight. */
export const packets = (page: Page, label: string) => text(page, label).count();
export const nextButton = (page: Page) => page.getByRole('button', { name: /^(Next|Restart)/ });

/** Opacity of the group a piece of diagram text sits in: '1' shown, '0' faded out. */
export const groupOpacity = (page: Page, value: string) =>
  text(page, value)
    .locator('xpath=..')
    .evaluate((g) => getComputedStyle(g).opacity);

/** The three metric tiles as "value|tone". */
const metrics = (page: Page) =>
  page
    .locator('div[data-tone]')
    .evaluateAll((tiles) =>
      tiles.map((t) => `${t.lastElementChild?.textContent}|${t.getAttribute('data-tone')}`),
    );
export const expectMetrics = (page: Page, expected: string[]) =>
  expect.poll(() => metrics(page)).toEqual(expected);

/** The label of the last step's button: the next playable lesson, or a restart. */
export function lastStepButton(slug: string) {
  const next = nextLessonAfter(slug);
  return next ? `Next lesson: ${next.title} →` : 'Restart lesson ↺';
}

export async function expectStep(
  page: Page,
  n: number,
  total: number,
  title: string,
  next: string,
) {
  await expect(stepTitle(page)).toHaveText(title);
  await expect(page.getByText(`Step ${n} of ${total}`)).toBeVisible();
  // In the live region: the step card also holds invisible copies of every step.
  await expect(
    page.locator('[aria-live="polite"]').getByText(`Step ${n} / ${total}`),
  ).toBeVisible();
  await expect(nextButton(page)).toHaveAccessibleName(next);
}

/** Checks a verdict table's title and rows, in order. */
export async function expectVerdicts(page: Page, title: string, rows: Array<[string, string]>) {
  await expect(diagram(page)).toHaveCount(0);
  const table = page.getByRole('table', { name: title });
  await expect(table).toBeVisible();
  const found = table.getByRole('row');
  await expect(found).toHaveCount(rows.length);
  for (const [i, [label, verdict]] of rows.entries()) {
    await expect(found.nth(i).getByRole('rowheader')).toHaveText(label);
    await expect(found.nth(i).getByRole('cell')).toHaveText(verdict);
  }
}

/**
 * Runs axe on the final state of every step. Call with reduced motion on: each step then shows its
 * final state at once, with no timers and no animation.
 */
export async function expectEveryStepAxeClean(page: Page, url: string, steps: number) {
  await page.goto(url);
  await waitForHydration(page);
  for (let i = 0; i < steps; i += 1) {
    if (i > 0) await key(page, 'ArrowRight');
    await expect(page.getByText(`Step ${i + 1} of ${steps}`)).toBeVisible();
    await expectNoAxeViolations(page);
  }
}

/**
 * Runs axe with a packet in flight. axe runs timers of its own, so the page clock must run again
 * before it starts; the player is paused first, so the page stays as it was meant to be checked.
 */
export async function expectPacketAxeClean(page: Page, url: string, at: number) {
  await openFrozen(page, url);
  await advance(page, at);
  await key(page, 'Space');
  await page.clock.resume();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expectNoAxeViolations(page);
}
