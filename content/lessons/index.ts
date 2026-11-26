import type { AnyLesson } from '@/engine/types';

/**
 * The ordered registry of lessons, including coming-soon stubs for the catalog.
 * Adding a lesson adds one import and one entry here, at its position.
 * Empty until M3, which ports the first two lessons.
 */
export const lessons: readonly AnyLesson[] = [];
