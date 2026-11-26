import { describe, expect, it } from 'vitest';
import { scenes } from '@/components/scenes/registry';
import { validateLesson, validateLessons } from '@/engine/validate';
import { lessons } from './index';

/**
 * The content validation test. It runs over every lesson in the registry, so a mistake in
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
});
