import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadAllLessons } from '@content/lessons';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { loadAllScenes, loadScene, sceneEntry, sceneRegistry } from './registry';

describe('the scene registry', () => {
  it('loads a scene by id, with the parts of the scene contract', async () => {
    const scene = await loadScene('push-pull-sync');
    expect(scene.viewBox).toMatch(/^0 0 \d+ \d+$/);
    expect(Object.keys(scene.lanes)).toEqual(['push', 'pull']);
    expect(typeof scene.Component).toBe('function');
    expect(typeof scene.metrics).toBe('function');
  });

  it('loads one scene per entry', async () => {
    const all = await loadAllScenes();
    expect(Object.keys(all).sort()).toEqual(Object.keys(sceneRegistry).sort());
  });

  it('throws a message that names the id for a scene that is not registered', () => {
    expect(() => loadScene('missing')).toThrow(/no scene "missing"/i);
    expect(() => sceneEntry('toString')).toThrow(/no scene "toString"/i);
  });

  it("draws, through each entry's view, the same scene that its loader gives", async () => {
    const lessons = await loadAllLessons();
    expect(lessons.map((l) => l.sceneId).sort()).toEqual(Object.keys(sceneRegistry).sort());
    for (const lesson of lessons) {
      const { View } = sceneEntry(lesson.sceneId);
      const { unmount } = render(
        <View lesson={lesson} header={<LessonHeader lesson={lesson} lessonCount={12} />} />,
      );
      const diagram = await screen.findByRole('img');
      const scene = await loadScene(lesson.sceneId);
      expect(diagram.getAttribute('viewBox'), lesson.slug).toBe(scene.viewBox);
      expect(diagram.getAttribute('aria-label'), lesson.slug).toBe(lesson.steps[0]!.sceneAlt);
      unmount();
    }
  });
});
