import type { AnyLesson } from '@/engine/types';
import { optimisticUi } from './optimistic-ui';
import { pushPullSync } from './push-pull-sync';

/**
 * The ordered registry of playable lessons. Adding a lesson adds one import and one entry
 * here, at its position, and flips its catalog entry to `ready` in catalog.ts. A lesson that is
 * not ready has only a catalog entry, never a Lesson (see D12 in docs/DECISIONS.md).
 */
export const lessons: readonly AnyLesson[] = [optimisticUi, pushPullSync];

/**
 * The playable lesson that follows `slug`, or null on the last one. A lesson that is only a
 * catalog entry ("coming soon") is never the next lesson, because there is nothing to open.
 */
export function nextLessonAfter(slug: string): AnyLesson | null {
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  return index === -1 ? null : (lessons[index + 1] ?? null);
}
