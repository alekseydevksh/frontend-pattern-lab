import type { AnyLesson } from '@/engine/types';
import { readyEntries } from './catalog';

/** Loads one lesson's data. A lesson's file is read only when something asks for that lesson. */
export type LessonLoader = () => Promise<AnyLesson>;

/**
 * The registry of playable lessons: a slug and a loader. Adding a lesson adds one line here, and
 * flips its catalog entry to `ready` in catalog.ts. A lesson page loads its own lesson and no
 * other, and the catalog loads none (see D14 in docs/DECISIONS.md). A lesson that is not ready
 * has only a catalog entry, never a Lesson (D12).
 */
export const lessonLoaders: Readonly<Record<string, LessonLoader>> = {
  'optimistic-ui': () => import('./optimistic-ui').then((m) => m.optimisticUi),
  'push-pull-sync': () => import('./push-pull-sync').then((m) => m.pushPullSync),
  virtualization: () => import('./virtualization').then((m) => m.virtualization),
};

/** The lesson for `slug`, or null if there is no playable lesson with that slug. */
export async function loadLesson(slug: string): Promise<AnyLesson | null> {
  const load = Object.hasOwn(lessonLoaders, slug) ? lessonLoaders[slug] : undefined;
  return load ? load() : null;
}

/** Every playable lesson, in lesson order. For tests and tools; no page needs all of them. */
export async function loadAllLessons(): Promise<AnyLesson[]> {
  const lessons = await Promise.all(readyEntries.map((entry) => loadLesson(entry.slug)));
  return lessons.filter((lesson): lesson is AnyLesson => lesson !== null);
}
