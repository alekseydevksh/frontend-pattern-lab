/// <reference types="vite/types/import-meta.d.ts" />
import type { LessonPageComponent } from '@/app/(site)/lessons/lessonPage';
import type { AnyLesson, AnySceneDefinition } from '@/engine/types';

/**
 * The scene registry, for tests and tools: every lesson page, with the lesson and the scene it
 * draws, and from those the scenes by `sceneId`. Nothing registers here by hand: a lesson's
 * `page.tsx` under `src/app/(site)/lessons/<slug>/` is its registration, and this module reads them
 * all (D16).
 *
 * The app never imports this module. A lesson page imports its own scene, so the browser gets that
 * scene and no other, and no map of scenes ships to any page. `import.meta.glob` is Vite's, so this
 * runs under Vitest and Storybook, not in the Next.js build, which fails loudly if it is ever
 * imported there.
 */

const pages = import.meta.glob<LessonPageComponent>('/src/app/\\(site\\)/lessons/*/page.tsx', {
  eager: true,
  import: 'default',
});

export interface LessonPageEntry {
  /** The name of the page's folder, which is the lesson's address. */
  folder: string;
  lesson: AnyLesson;
  scene: AnySceneDefinition;
}

/** Every lesson page, in lesson order. */
export const lessonPages: readonly LessonPageEntry[] = Object.entries(pages)
  .map(([path, page]) => ({
    folder: path.split('/').at(-2) ?? '',
    lesson: page.lesson,
    scene: page.scene,
  }))
  .sort((a, b) => a.lesson.order - b.lesson.order);

/** Every playable lesson, in lesson order. */
export const lessons: readonly AnyLesson[] = lessonPages.map((page) => page.lesson);

/** The scene each `sceneId` names, as the lesson pages pair them. */
export const sceneRegistry: Readonly<Record<string, AnySceneDefinition>> = Object.fromEntries(
  lessonPages.map((page) => [page.lesson.sceneId, page.scene]),
);
