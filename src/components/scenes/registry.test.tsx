import { describe, expect, it } from 'vitest';
import { readyEntries } from '@content/lessons/catalog';
import { lessonPages, lessons, sceneRegistry } from './registry';

describe('the scene registry', () => {
  it('finds every lesson page, in lesson order', () => {
    expect(lessonPages.map((p) => p.folder)).toEqual(readyEntries.map((e) => e.slug));
    expect(lessons.map((l) => l.slug)).toEqual(readyEntries.map((e) => e.slug));
  });

  it('gives each page a scene with the parts of the scene contract', () => {
    for (const { folder, scene } of lessonPages) {
      expect(scene.viewBox, folder).toMatch(/^0 0 \d+ \d+$/);
      expect(Object.keys(scene.lanes).length, folder).toBeGreaterThan(0);
      expect(typeof scene.Component, folder).toBe('function');
      expect(typeof scene.metrics, folder).toBe('function');
    }
  });

  it("holds each page's scene under its lesson's sceneId, and one scene per sceneId", () => {
    for (const { folder, lesson, scene } of lessonPages) {
      expect(sceneRegistry[lesson.sceneId], folder).toBe(scene);
    }
    expect(Object.keys(sceneRegistry)).toHaveLength(new Set(lessonPages.map((p) => p.scene)).size);
  });

  it("gives every lesson a scene of its own, so no page draws another lesson's scene", () => {
    expect(new Set(lessonPages.map((p) => p.scene)).size).toBe(lessonPages.length);
  });
});
