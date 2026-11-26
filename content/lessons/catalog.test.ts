import { describe, expect, it } from 'vitest';
import type { Track } from '@/engine/types';
import { catalog, lessonNumber } from './catalog';
import { lessons, nextLessonAfter } from './index';

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

  it('has a playable lesson for every ready entry, in the same place and with the same text', () => {
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
    });
  });

  it('has a ready entry for every registered lesson', () => {
    for (const lesson of lessons) {
      const entry = catalog.find((e) => e.slug === lesson.slug);
      expect(entry?.status, lesson.slug).toBe('ready');
    }
    expect(catalog.filter((e) => e.status === 'ready')).toHaveLength(lessons.length);
  });

  it('numbers lessons by their place in the catalog', () => {
    expect(lessonNumber('optimistic-ui')).toBe(1);
    expect(lessonNumber('errors-and-observability')).toBe(12);
    expect(lessonNumber('no-such-lesson')).toBeNull();
  });
});

describe('nextLessonAfter', () => {
  it('gives the next playable lesson', () => {
    expect(nextLessonAfter('optimistic-ui')?.slug).toBe('push-pull-sync');
  });

  it('gives nothing after the last playable lesson, even if a coming-soon one follows', () => {
    const last = lessons.at(-1);
    expect(last).toBeDefined();
    expect(nextLessonAfter(last?.slug ?? '')).toBeNull();
  });

  it('gives nothing for an unknown slug', () => {
    expect(nextLessonAfter('nope')).toBeNull();
  });
});
