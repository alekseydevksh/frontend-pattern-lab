import type { AnyLesson } from '@/engine/types';
import { optimisticUi } from './optimistic-ui';
import { pushPullSync } from './push-pull-sync';

/**
 * The ordered registry of playable lessons. Adding a lesson adds one import and one entry
 * here, at its position. (Lessons that are not ready yet get a catalog entry in M4, not a
 * Lesson: see D12 in docs/DECISIONS.md.)
 */
export const lessons: readonly AnyLesson[] = [optimisticUi, pushPullSync];
