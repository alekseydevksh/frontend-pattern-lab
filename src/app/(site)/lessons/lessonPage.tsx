import type { Metadata } from 'next';
import { catalog, nextLessonAfter, readyEntries, type ReadyEntry } from '@content/lessons/catalog';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { MAIN_ID } from '@/components/shell/SiteShell';
import type { AnyLesson, AnySceneDefinition, Lesson, SceneDefinition } from '@/engine/types';
import { pageMetadata } from '@/lib/metadata';
import { LessonRoute } from './LessonRoute';

/**
 * What a lesson's `page.tsx` exports by default: the page, with the lesson and the scene it draws
 * attached, so tests can find every lesson and its scene by reading the lesson pages (see
 * `src/components/scenes/registry.ts`).
 */
export type LessonPageComponent = (() => React.JSX.Element) & {
  lesson: AnyLesson;
  scene: AnySceneDefinition;
};

/** The catalog entry of a lesson that has a page. A page for a lesson that is not ready fails the build. */
function readyEntryFor(slug: string): ReadyEntry {
  const entry = readyEntries.find((e) => e.slug === slug);
  if (!entry) {
    throw new Error(
      `"${slug}" has a lesson page, but its entry in content/lessons/catalog.ts is not ready.`,
    );
  }
  return entry;
}

/**
 * The page of one lesson, for its `page.tsx`. Each lesson has a folder of its own under
 * `src/app/(site)/lessons/`, whose page imports the lesson's data and its scene and passes them
 * here. A route is bundled on its own, so a lesson page ships its own scene and no other, and no
 * map of scenes reaches the browser (D16).
 *
 * The lesson and the scene must share a state type, so a lesson cannot be paired with a scene that
 * draws another state. The scene module is a client module (`'use client'`): on the server, the
 * scene is a reference that this page hands to the player, which draws it in the browser and in the
 * server HTML.
 */
export function lessonPage<S>(lesson: Lesson<S>, scene: SceneDefinition<S>): LessonPageComponent {
  readyEntryFor(lesson.slug);
  const next = nextLessonAfter(lesson.slug);
  function LessonPage() {
    return (
      <main id={MAIN_ID} className="mx-auto max-w-[1240px] px-4">
        <LessonRoute
          lesson={lesson}
          scene={scene}
          header={<LessonHeader lesson={lesson} lessonCount={catalog.length} />}
          next={next ? { title: next.title, href: `/lessons/${next.slug}/` } : null}
        />
      </main>
    );
  }
  return Object.assign(LessonPage, { lesson, scene });
}

/** The metadata of a lesson page: its title and summary as the catalog lists them. */
export function lessonMetadata(lesson: AnyLesson): Metadata {
  const entry = readyEntryFor(lesson.slug);
  return pageMetadata({
    title: entry.title,
    description: entry.summary,
    path: `/lessons/${entry.slug}/`,
  });
}
