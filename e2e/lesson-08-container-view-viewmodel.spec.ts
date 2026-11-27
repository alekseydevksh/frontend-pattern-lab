import { expect, test } from '@playwright/test';
import {
  diagram,
  expectMetrics,
  expectStep,
  expectVerdicts,
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
 * Lesson 8, Container, View, ViewModel, played from the first step to the last with the keyboard
 * alone, against a frozen clock. Frame times are in content/lessons/container-view-viewmodel.ts. The
 * step card and layout-shift checks at desktop and phone width run for every ready lesson in
 * step-card.spec.ts and layout-shift.spec.ts; the metric labels and values at 375 px in
 * metric-labels.spec.ts; the takeaways, Space and R, reduced motion and axe in lesson-shared.spec.ts.
 */

const URL = '/lessons/container-view-viewmodel/';
const lesson = loadLesson('container-view-viewmodel');
const STEPS = 6;
const N = 'neutral';

/** The three metric tiles: backend fields, UI fields, decisions left in the view. */
const tiles = (backend: number, ui: number, logic: number) => [
  `${backend}|${N}`,
  `${ui}|${N}`,
  `${logic}|${logic > 0 ? 'bad' : 'good'}`,
];

test.describe('lesson 8: Container, View, ViewModel', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    const run = playhead(page, lesson);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Container, View, ViewModel');
    await expect(page.getByText('08. Structure / Lesson 8 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. One component fetches, decides and draws.
    await expectStep(page, 1, STEPS, 'One component does it all', 'Next: Three layers →');
    await expect(diagram(page)).toHaveAccessibleName(/^One wide box, titled one component/);
    await expect(text(page, 'illustrative offer · simulated requests')).toBeVisible();
    await expect(text(page, 'ONE COMPONENT · OfferPage')).toBeVisible();
    await expect(text(page, 'CONTAINER')).toHaveCount(0);
    await expect(text(page, 'FETCH')).toHaveCount(2);
    await expect(text(page, 'DECIDE')).toHaveCount(4);
    await expect(text(page, 'DRAW')).toHaveCount(2);
    await expectMetrics(page, tiles(0, 0, 4));
    await run.toFrame(0);
    expect(await packets(page, 'GET offer')).toBe(1);
    await run.toFrame(1);
    expect(await packets(page, 'payload')).toBe(1);
    await run.toFrame(2); // the response: seven raw fields
    await expect(text(page, 'RAW PAYLOAD')).toBeVisible();
    await expect(text(page, 'owner_id')).toBeVisible();
    await expectMetrics(page, tiles(7, 0, 4));

    // 2. Three layers, one job each; the decisions are still in the view.
    await run.next();
    await expectStep(page, 2, STEPS, 'Three layers, one job each', 'Next: The container →');
    await expect(text(page, 'ONE COMPONENT · OfferPage')).toBeVisible();
    await expectMetrics(page, tiles(0, 0, 4));
    await run.toFrame(0);
    await expect(text(page, 'ONE COMPONENT · OfferPage')).toHaveCount(0);
    for (const word of ['CONTAINER', 'VIEW MODEL', 'VIEW']) {
      await expect(text(page, word)).toBeVisible();
    }
    await expect(text(page, 'LOGIC IN THE VIEW')).toBeVisible();
    await expect(text(page, 'nothing to draw yet')).toBeVisible();
    await expect(text(page, 'request: idle')).toBeVisible();
    await expectMetrics(page, tiles(0, 0, 4));

    // 3. The container fetches and mutates.
    await run.next();
    await expectStep(page, 3, STEPS, 'The container fetches and mutates', 'Next: The view model →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText('PATCH');
    await run.toFrame(0);
    await expect(text(page, 'request: loading')).toBeVisible();
    await expect(text(page, 'GET /offers/7')).toBeVisible();
    await run.toFrame(1);
    expect(await packets(page, 'GET offer')).toBe(1);
    await run.toFrame(2);
    expect(await packets(page, 'payload')).toBe(1);
    await run.toFrame(3);
    await expect(text(page, 'request: ready')).toBeVisible();
    await expect(text(page, 'price_cents: 1999')).toBeVisible();
    await expectMetrics(page, tiles(7, 0, 4));
    await run.toFrame(4);
    await expect(text(page, 'PATCH /offers/7')).toBeVisible();
    await run.toFrame(5);
    expect(await packets(page, 'pause')).toBe(1);

    // 4. The view model builds the five screen fields; the decisions leave the view.
    await run.next();
    await expectStep(page, 4, STEPS, 'The view model translates', 'Next: The view →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      'allowedActions',
    );
    await expectMetrics(page, tiles(7, 0, 4));
    await run.toFrame(0);
    expect(await packets(page, 'payload')).toBe(1);
    await run.toFrame(1);
    await expect(text(page, 'title: Spring sale')).toBeVisible();
    await expect(text(page, 'left out: owner_id, region')).toBeVisible();
    await expectMetrics(page, tiles(7, 1, 4));
    await run.toFrame(2);
    await expect(text(page, 'price: $19.99')).toBeVisible();
    await expect(text(page, 'price_cents / 100')).toHaveCount(0);
    await expectMetrics(page, tiles(7, 2, 3));
    await run.toFrame(3);
    await expectMetrics(page, tiles(7, 3, 2));
    await run.toFrame(4);
    await expectMetrics(page, tiles(7, 4, 1));
    await run.toFrame(5);
    await expect(text(page, 'actions: Edit · Pause')).toBeVisible();
    await expect(text(page, 'LOGIC IN THE VIEW')).toHaveCount(0);
    await expectMetrics(page, tiles(7, 5, 0));

    // 5. The view draws loading, the offer, and the failure.
    await run.next();
    await expectStep(page, 5, STEPS, 'The view only draws', 'Next: Why it pays →');
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText("'loading'");
    await expect(text(page, 'nothing to draw yet')).toBeVisible();
    await expectMetrics(page, tiles(7, 5, 0));
    await run.toFrame(0);
    await expect(text(page, 'LOADING…')).toBeVisible();
    await expect(text(page, 'request: loading')).toBeVisible();
    await run.toFrame(1);
    expect(await packets(page, 'UI model')).toBe(1);
    await run.toFrame(2);
    await expect(text(page, 'Active')).toBeVisible();
    await expect(text(page, '3 days left')).toBeVisible();
    await expect(text(page, 'Edit')).toBeVisible();
    await expect(text(page, 'LOADING…')).toHaveCount(0);
    await run.toFrame(3);
    await expect(text(page, 'COULD NOT LOAD')).toBeVisible();
    await expect(text(page, 'Try again')).toBeVisible();
    await expect(text(page, 'request: failed')).toBeVisible();
    await expectMetrics(page, tiles(7, 5, 0));

    // 6. The verdict table, in place of the diagram.
    await run.next();
    await expectStep(
      page,
      6,
      STEPS,
      'Why it pays, and when it does not',
      lastStepButton('container-view-viewmodel'),
    );
    await expectVerdicts(page, 'WHICH LAYER DOES IT?', [
      ['Fetching the offer', 'Container'],
      ['Turning cents into a price label', 'View model'],
      ['Deciding which buttons show', 'View model'],
      ['Drawing loading and error', 'View'],
      ['A small read-only widget', 'A hook is enough'],
      ['A throwaway prototype', 'One component'],
    ]);
    await expectMetrics(page, tiles(7, 5, 0));

    // And back again, one step at a time, down to the first.
    for (const title of [
      'The view only draws',
      'The view model translates',
      'The container fetches and mutates',
      'Three layers, one job each',
      'One component does it all',
    ]) {
      await key(page, 'ArrowLeft');
      await expect(stepTitle(page)).toHaveText(title);
    }
    await expect(diagram(page)).toBeVisible();
  });
});
