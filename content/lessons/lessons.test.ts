import { describe, expect, it } from 'vitest';
import { lessonPages, lessons, sceneRegistry as scenes } from '@/components/scenes/registry';
import { patchState, startStateOf } from '@/engine/state';
import { validateLesson, validateLessons } from '@/engine/validate';

/** The longest metric value that fits its tile on a 375 px phone (docs/ADDING_A_LESSON.md). */
const MAX_METRIC_CHARS = 7;

/**
 * The content validation test. It runs over every lesson page's lesson, with the scene that page
 * draws (src/components/scenes/registry.ts), so a mistake in
 * lesson data (a repeated step id, a bad takeawayIndex, unsorted frames, a missing scene,
 * an unknown lane, an empty sceneAlt) fails the build. The rules themselves are tested,
 * with deliberately broken lessons, in src/engine/validate.test.ts.
 */
describe('content/lessons', () => {
  it('registers at least two lessons, so an emptied registry cannot pass for nothing to check', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(2);
  });

  it('has no validation problems', () => {
    expect(validateLessons(lessons, scenes)).toEqual([]);
  });

  it('lists lessons in ascending order', () => {
    const orders = lessons.map((lesson) => lesson.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it.each(lessons.map((lesson) => [lesson.slug, lesson] as const))(
    '%s is valid on its own',
    (_slug, lesson) => {
      expect(validateLesson(lesson, scenes)).toEqual([]);
    },
  );

  it('has a scene in the registry for every lesson', () => {
    for (const lesson of lessons) {
      expect(Object.keys(scenes), lesson.slug).toContain(lesson.sceneId);
    }
  });

  it('ticks the takeaways in order, so the checklist fills from the top', () => {
    for (const lesson of lessons) {
      const indexes = lesson.steps.map((step) => step.takeawayIndex);
      expect(indexes, lesson.slug).toEqual([...indexes].sort((a, b) => a - b));
    }
  });

  it(`keeps every metric value within ${MAX_METRIC_CHARS} characters at every step and frame`, () => {
    // The shared metric tile does not stretch: a longer value is cut off on a phone.
    for (const { lesson, scene } of lessonPages) {
      for (const step of lesson.steps) {
        let state = startStateOf(lesson, step);
        const states = [state, ...step.frames.map((f) => (state = patchState(state, f.set)))];
        for (const [i, s] of states.entries()) {
          for (const metric of scene.metrics(s)) {
            expect(
              metric.value.length,
              `${lesson.slug}, step "${step.id}", ${i === 0 ? 'start' : `frame ${i - 1}`}: "${metric.value}"`,
            ).toBeLessThanOrEqual(MAX_METRIC_CHARS);
          }
        }
      }
    }
  });
});
