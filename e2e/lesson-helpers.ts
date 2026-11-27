import { createRequire } from 'node:module';
import { expect, type Locator, type Page } from '@playwright/test';
import { nextLessonAfter } from '../content/lessons/catalog';
import { PACKET_DURATION_MS } from '../src/engine/packets';
import type { AnyLesson } from '../src/engine/types';
import { expectNoAxeViolations, waitForHydration } from './support';

/**
 * Helpers for the end-to-end test of one lesson (`e2e/lesson-NN-<slug>.spec.ts`, from lesson 3 on).
 * A lesson is played against a frozen browser clock, so a frame fires exactly when the test says
 * time has passed. Packets last 900 ms.
 */

/**
 * The lesson data of a slug, read from `content/lessons/<slug>.ts`, so a shared check needs no
 * list of lessons and no import per lesson. The data file exports one `Lesson` with that slug.
 */
export function loadLesson(slug: string): AnyLesson {
  const load = createRequire(__filename);
  const exported = load(`../content/lessons/${slug}`) as Record<string, unknown>;
  const lesson = Object.values(exported).find(
    (value): value is AnyLesson =>
      typeof value === 'object' && value !== null && (value as AnyLesson).slug === slug,
  );
  if (!lesson) throw new Error(`content/lessons/${slug}.ts exports no lesson with that slug.`);
  return lesson;
}

/**
 * The markup of an element's contents with each element's attributes in a fixed order, so equal
 * pictures compare equal: React appends an attribute that is added by an update (a dash pattern,
 * say), so the same picture can list its attributes in another order, and the server's `style`
 * text differs from the browser's own after an update (`translate(0px, 0)` and `translate(0px, 0px)`).
 */
export const markup = (locator: Locator) =>
  locator.evaluate((root) => {
    const canonical = (node: Element): string => {
      const attrs = [...node.attributes]
        // The server writes a style as text and an update as the browser's own: compare the parsed one.
        .map(
          (a) => `${a.name}="${a.name === 'style' ? (node as SVGElement).style.cssText : a.value}"`,
        )
        .sort()
        .join(' ');
      const inner = [...node.childNodes]
        .map((child) => (child instanceof Element ? canonical(child) : child.textContent))
        .join('');
      return `<${node.tagName} ${attrs}>${inner}</${node.tagName}>`;
    };
    return [...root.childNodes]
      .map((child) => (child instanceof Element ? canonical(child) : child.textContent))
      .join('');
  });

/** The takeaways ticked once the learner is on step `stepIndex`: those of every step up to it. */
export function takeawaysReached(lesson: AnyLesson, stepIndex: number): boolean[] {
  const reached = new Set(lesson.steps.slice(0, stepIndex + 1).map((s) => s.takeawayIndex));
  return lesson.takeaways.map((_, index) => reached.has(index));
}

/** The times, from the start of a step, at which something happens: its frames, sorted. */
export const frameTimes = (step: AnyLesson['steps'][number]): number[] =>
  [...new Set(step.frames.map((f) => f.at))].sort((a, b) => a - b);

/**
 * How long a step takes to play to its final state: its last frame, plus the flight of a packet
 * sent by that frame.
 */
export function playTime(step: AnyLesson['steps'][number]): number {
  return Math.max(0, ...step.frames.map((f) => f.at + (f.packet ? PACKET_DURATION_MS : 0)));
}

/** The first frame that sends a packet: the step it is in (from 0) and its time in that step. */
export function firstPacket(lesson: AnyLesson): { step: number; at: number } | undefined {
  for (const [step, { frames }] of lesson.steps.entries()) {
    const frame = frames.find((f) => f.packet);
    if (frame) return { step, at: frame.at };
  }
  return undefined;
}

/**
 * Plays a lesson against the frozen clock by its own data: `toFrame(k)` runs the clock to the time
 * of frame `k` (from 0) of the step on screen, and `next()` presses the arrow to the next step, so
 * a play-through never repeats a frame time that the lesson data already holds. Call it after
 * `openFrozen`, on the step the page opened on.
 */
export function playhead(page: Page, lesson: AnyLesson) {
  let step = 0;
  let now = 0;
  return {
    async toFrame(k: number) {
      const frame = lesson.steps[step]?.frames[k];
      if (!frame) throw new Error(`${lesson.slug}: step ${step + 1} has no frame ${k}.`);
      if (frame.at < now) throw new Error(`Frame ${k} of step ${step + 1} is already behind.`);
      await advance(page, frame.at - now);
      now = frame.at;
    },
    async next() {
      await key(page, 'ArrowRight');
      step += 1;
      now = 0;
    },
  };
}

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
 * `at` is the time in step number `step` (from 0) at which the packet has just left.
 */
export async function expectPacketAxeClean(page: Page, url: string, at: number, step = 0) {
  await openFrozen(page, url);
  for (let i = 0; i < step; i += 1) await key(page, 'ArrowRight');
  await advance(page, at);
  await key(page, 'Space');
  await page.clock.resume();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expectNoAxeViolations(page);
}
