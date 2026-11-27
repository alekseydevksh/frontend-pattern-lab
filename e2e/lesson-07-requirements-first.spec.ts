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
 * Lesson 7, Requirements First and Component Boundaries, played from the first step to the last with
 * the keyboard alone, against a frozen clock. Frame times are in content/lessons/requirements-first.ts.
 * The step card and layout-shift checks at desktop and phone width run for every ready lesson in
 * step-card.spec.ts and layout-shift.spec.ts; the metric labels and values at 375 px in
 * metric-labels.spec.ts; the takeaways, Space and R, reduced motion and axe in lesson-shared.spec.ts.
 */

const URL = '/lessons/requirements-first/';
const lesson = loadLesson('requirements-first');
const STEPS = 6;
const N = 'neutral';

/** How many pieces of diagram text carry this word. */
const marked = (page: Parameters<typeof text>[0], word: string) => text(page, word).count();

test.describe('lesson 7: Requirements First and Component Boundaries', () => {
  test.use({ colorScheme: 'light' });

  test('plays from the first step to the last with the keyboard alone', async ({ page }) => {
    test.setTimeout(60_000);
    await openFrozen(page, URL);
    const run = playhead(page, lesson);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Requirements First and Component Boundaries',
    );
    await expect(page.getByText('07. Structure / Lesson 7 of 12')).toBeVisible();
    await expect(page.getByText('6 steps')).toBeVisible();

    // 1. Six requirements arrive, one by one, and nobody owns any of them.
    await expectStep(
      page,
      1,
      STEPS,
      'Start from the requirements',
      'Next: Two kinds of requirement →',
    );
    await expect(diagram(page)).toHaveAccessibleName(/^On the left, six requirement cards appear/);
    await expect(text(page, 'illustrative screen, requirements and parts')).toBeVisible();
    await expect(text(page, 'no requirements yet')).toBeVisible();
    await expect(text(page, 'NO STRUCTURE YET')).toBeVisible();
    await expectMetrics(page, [`0|${N}`, `0|${N}`, `0|${N}`]);
    await run.toFrame(0);
    await expect(text(page, 'List the offers')).toBeVisible();
    await expectMetrics(page, [`1|${N}`, `0|${N}`, '1|bad']);
    await run.toFrame(2);
    expect(await marked(page, 'no clear owner')).toBe(3);
    expect(await marked(page, 'FUNCTIONAL')).toBe(3);
    await run.toFrame(5);
    expect(await marked(page, 'no clear owner')).toBe(6);
    expect(await marked(page, 'NON-FUNCTIONAL')).toBe(3);
    await expect(text(page, 'List appears quickly')).toBeVisible();
    await expectMetrics(page, [`6|${N}`, `0|${N}`, '6|bad']);

    // 2. The two kinds, and what each pulls on.
    await run.next();
    await expectStep(page, 2, STEPS, 'Two kinds of requirement', 'Next: A page and an app →');
    await expectMetrics(page, [`6|${N}`, `0|${N}`, '6|bad']);
    await expect(text(page, 'NO STRUCTURE YET')).toBeVisible();
    await run.toFrame(0);
    await expect(text(page, 'FUNCTIONAL · WHAT IT DOES')).toBeVisible();
    await expect(text(page, 'NON-FUNCTIONAL · HOW WELL')).toHaveCount(0);
    await run.toFrame(1);
    await expect(text(page, 'NON-FUNCTIONAL · HOW WELL')).toBeVisible();
    await expect(text(page, 'NO STRUCTURE YET')).toHaveCount(0);

    // 3. A static page fits two layers; the offers screen strains the same two.
    await run.next();
    await expectStep(
      page,
      3,
      STEPS,
      'A page and an app feel different pressure',
      'Next: Boundaries drawn by looks →',
    );
    await expect(text(page, 'Show the opening hours')).toBeVisible();
    await expect(text(page, 'HoursPage')).toBeVisible();
    await expectMetrics(page, [`3|${N}`, `2|${N}`, '0|good']);
    await run.toFrame(0);
    await expect(text(page, 'Filter by status')).toBeVisible();
    await expect(text(page, 'Show the opening hours')).toHaveCount(0);
    expect(await marked(page, 'no clear owner')).toBe(3);
    await expect(text(page, '3 requirements have no clear owner')).toBeVisible();
    await expectMetrics(page, [`6|${N}`, `2|${N}`, '3|bad']);

    // 4. Boundaries drawn by looks: the new requirement reaches every part.
    await run.next();
    await expectStep(
      page,
      4,
      STEPS,
      'Boundaries drawn by looks',
      'Next: Boundaries drawn by responsibility →',
    );
    await expect(text(page, 'SPLIT BY LOOKS')).toBeVisible();
    await expect(text(page, 'CardGrid')).toBeVisible();
    expect(await marked(page, 'EDIT')).toBe(0);
    await expectMetrics(page, [`6|${N}`, `2|${N}`, '4|bad']);
    await run.toFrame(0); // the seventh requirement arrives
    await expect(text(page, 'Offers can be paused')).toBeVisible();
    expect(await marked(page, 'NEW')).toBe(1);
    await expectMetrics(page, [`7|${N}`, `2|${N}`, '5|bad']);
    await run.toFrame(1);
    expect(await packets(page, 'change')).toBe(1);
    await run.toFrame(2); // every part must be edited
    expect(await marked(page, 'EDIT')).toBe(4);
    await expect(text(page, '4 of 4 parts to edit')).toBeVisible();
    await expectMetrics(page, [`7|${N}`, `2|${N}`, '5|bad']);

    // 5. Boundaries drawn by responsibility: one part changes.
    await run.next();
    await expectStep(
      page,
      5,
      STEPS,
      'Boundaries drawn by responsibility',
      'Next: Which layer owns it? →',
    );
    await expect(page.getByRole('region', { name: 'Code example' })).toContainText(
      "from '../domain/OfferCard'",
    );
    await expect(text(page, 'SPLIT BY RESPONSIBILITY')).toBeVisible();
    await expect(text(page, 'StatusBadge')).toBeVisible();
    expect(await marked(page, 'no clear owner')).toBe(0);
    await expectMetrics(page, [`6|${N}`, `4|${N}`, '0|good']);
    await run.toFrame(0);
    await expect(text(page, 'owner: StatusBadge')).toBeVisible();
    await expectMetrics(page, [`7|${N}`, `4|${N}`, '0|good']);
    await run.toFrame(1);
    expect(await packets(page, 'change')).toBe(1);
    await run.toFrame(2);
    expect(await marked(page, 'EDIT')).toBe(1);
    await expect(text(page, '1 of 7 parts to edit')).toBeVisible();
    await expectMetrics(page, [`7|${N}`, `4|${N}`, '0|good']);

    // 6. The verdict table, in place of the diagram.
    await run.next();
    await expectStep(page, 6, STEPS, 'Which layer owns it?', lastStepButton('requirements-first'));
    await expectVerdicts(page, 'WHICH LAYER OWNS IT?', [
      ['A button', 'Primitive'],
      ['An offer card', 'Domain component'],
      ['A create-offer form', 'Feature component'],
      ['The offers screen', 'Page'],
      ['A landing page with no data', 'Keep it flat'],
      ['A throwaway internal tool', 'Page and primitives'],
    ]);
    await expectMetrics(page, [`7|${N}`, `4|${N}`, '0|good']);

    // And back again, one step at a time, down to the first.
    for (const title of [
      'Boundaries drawn by responsibility',
      'Boundaries drawn by looks',
      'A page and an app feel different pressure',
      'Two kinds of requirement',
      'Start from the requirements',
    ]) {
      await key(page, 'ArrowLeft');
      await expect(stepTitle(page)).toHaveText(title);
    }
    await expect(diagram(page)).toBeVisible();
  });
});
