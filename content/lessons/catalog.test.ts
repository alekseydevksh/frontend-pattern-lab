import { describe, expect, it } from 'vitest';
import type { Track } from '@/engine/types';
import { catalog, lessonNumber, nextLessonAfter, readyEntries } from './catalog';
import { lessonLoaders, loadAllLessons, loadLesson } from './index';

const lessons = await loadAllLessons();
/** The first lesson that is still coming soon. Derived, so a new lesson does not edit this test. */
const firstSoon = catalog.find((e) => e.status === 'soon');

const tracks: Track[] = [
  'Data and state',
  'Rendering and performance',
  'Structure',
  'Product reliability',
];

/** The lesson table of docs/SPEC.md: number, title and track. */
const specTable: ReadonlyArray<readonly [string, Track]> = [
  ['Optimistic UI', 'Data and state'],
  ['Push + Pull Sync', 'Data and state'],
  ['Virtualization', 'Rendering and performance'],
  ['Normalized Data', 'Data and state'],
  ['Rendering Isolation', 'Rendering and performance'],
  ['State Ownership', 'Data and state'],
  ['Requirements First and Component Boundaries', 'Structure'],
  ['Container, View, ViewModel', 'Structure'],
  ['Backend for Frontend', 'Data and state'],
  ['Progressive Rendering', 'Rendering and performance'],
  ['Permission-Aware UI', 'Product reliability'],
  ['Errors and Observability', 'Product reliability'],
];

describe('content/lessons/catalog', () => {
  it('lists all twelve lessons of the spec table, in order, with their tracks', () => {
    expect(catalog.map((e) => [e.title, e.track])).toEqual(specTable);
  });

  it('has unique, well-formed slugs and filled-in text', () => {
    expect(new Set(catalog.map((e) => e.slug)).size).toBe(catalog.length);
    for (const entry of catalog) {
      expect(entry.slug, entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.summary.trim(), entry.slug).not.toBe('');
      expect(tracks, entry.slug).toContain(entry.track);
    }
  });

  it('has a playable lesson for every ready entry, in the same place and with the same text and size', () => {
    catalog.forEach((entry, index) => {
      const lesson = lessons.find((l) => l.slug === entry.slug);
      if (entry.status === 'soon') {
        expect(lesson, `${entry.slug} is coming soon but has a Lesson`).toBeUndefined();
        return;
      }
      expect(lesson, `${entry.slug} is ready but has no Lesson`).toBeDefined();
      expect(lesson?.order, entry.slug).toBe(index + 1);
      expect(lesson?.title, entry.slug).toBe(entry.title);
      expect(lesson?.summary, entry.slug).toBe(entry.summary);
      expect(lesson?.track, entry.slug).toBe(entry.track);
      // The catalog repeats the length so it never has to load a lesson to show it.
      expect(entry.status === 'ready' && entry.minutes, entry.slug).toBe(lesson?.minutes);
      expect(entry.status === 'ready' && entry.stepCount, entry.slug).toBe(lesson?.steps.length);
    });
  });

  it('has a loader for every ready entry and for no other lesson', () => {
    expect(Object.keys(lessonLoaders).sort()).toEqual(readyEntries.map((e) => e.slug).sort());
  });

  it('has a ready entry for every registered lesson', () => {
    for (const lesson of lessons) {
      const entry = catalog.find((e) => e.slug === lesson.slug);
      expect(entry?.status, lesson.slug).toBe('ready');
    }
    expect(catalog.filter((e) => e.status === 'ready')).toHaveLength(lessons.length);
  });

  it('lists the ready entries in lesson order', () => {
    const numbers = readyEntries.map((e) => lessonNumber(e.slug));
    expect(numbers).toEqual([...numbers].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(readyEntries.slice(0, 3).map((e) => e.slug)).toEqual([
      'optimistic-ui',
      'push-pull-sync',
      'virtualization',
    ]);
  });

  it('numbers lessons by their place in the catalog', () => {
    expect(lessonNumber('optimistic-ui')).toBe(1);
    expect(lessonNumber('errors-and-observability')).toBe(12);
    expect(lessonNumber('no-such-lesson')).toBeNull();
  });
});

describe('nextLessonAfter', () => {
  it('gives the next playable lesson', () => {
    const next = nextLessonAfter('optimistic-ui');
    expect(next?.slug).toBe('push-pull-sync');
    expect(next?.title).toBe('Push + Pull Sync');
  });

  it('gives nothing after the last playable lesson, even if a coming-soon one follows', () => {
    const last = readyEntries.at(-1);
    expect(last).toBeDefined();
    expect(nextLessonAfter(last?.slug ?? '')).toBeNull();
  });

  it('never gives a coming-soon lesson', () => {
    expect(firstSoon).toBeDefined();
    expect(nextLessonAfter(firstSoon?.slug ?? '')).toBeNull();
    for (const entry of readyEntries)
      expect(nextLessonAfter(entry.slug)?.status ?? 'ready').toBe('ready');
  });

  it('gives nothing for an unknown slug', () => {
    expect(nextLessonAfter('nope')).toBeNull();
  });
});

describe('loadLesson', () => {
  it('loads one lesson by slug, and nothing for a slug that has none', async () => {
    expect((await loadLesson('push-pull-sync'))?.slug).toBe('push-pull-sync');
    expect(await loadLesson(firstSoon?.slug ?? '')).toBeNull();
    expect(await loadLesson('toString')).toBeNull();
  });
});
