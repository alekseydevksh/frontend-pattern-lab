import dynamic from 'next/dynamic';
import { bindScene, type LessonViewProps } from '@/components/lesson/bindScene';
import type { ComponentType } from 'react';
import type { AnySceneDefinition } from '@/engine/types';

/** What the registry holds for a scene id. */
export interface SceneEntry {
  /** Loads the scene definition, for validation and tests. Nothing on a page calls it. */
  load: () => Promise<AnySceneDefinition>;
  /**
   * The lesson shell with this scene in it, loaded on demand. A lesson page renders the view of
   * its own scene, so the browser downloads that scene's chunk and no other, and Next.js preloads
   * the chunk in the page's HTML and draws the scene in the server HTML (D14).
   */
  View: ComponentType<LessonViewProps>;
}

/**
 * Maps a lesson's `sceneId` to its scene. Adding a lesson adds one entry here.
 *
 * Each entry names its scene file twice, with a literal `import()` each time: `next/dynamic` only
 * splits and preloads a chunk for an `import()` it can see written out in its own call, so `View`
 * cannot reuse `load`. Both calls name the same file, so there is still one chunk per scene.
 * `registry.test.ts` checks the two agree.
 */
export const sceneRegistry: Readonly<Record<string, SceneEntry>> = {
  'optimistic-ui': {
    load: () => import('./OptimisticUiScene').then((m) => m.optimisticUiScene),
    View: dynamic(() =>
      import('./OptimisticUiScene').then((m) => ({ default: bindScene(m.optimisticUiScene) })),
    ),
  },
  'push-pull-sync': {
    load: () => import('./PushPullScene').then((m) => m.pushPullScene),
    View: dynamic(() =>
      import('./PushPullScene').then((m) => ({ default: bindScene(m.pushPullScene) })),
    ),
  },
  virtualization: {
    load: () => import('./VirtualizationScene').then((m) => m.virtualizationScene),
    View: dynamic(() =>
      import('./VirtualizationScene').then((m) => ({ default: bindScene(m.virtualizationScene) })),
    ),
  },
};

/** The entry for `sceneId`. Throws on an id that is not registered, which validation rules out. */
export function sceneEntry(sceneId: string): SceneEntry {
  const entry = Object.hasOwn(sceneRegistry, sceneId) ? sceneRegistry[sceneId] : undefined;
  if (!entry) throw new Error(`No scene "${sceneId}" in the scene registry.`);
  return entry;
}

/** The scene definition for `sceneId`. */
export function loadScene(sceneId: string): Promise<AnySceneDefinition> {
  return sceneEntry(sceneId).load();
}

/** Every registered scene, by id. For tests and tools; a page never needs all of them. */
export async function loadAllScenes(): Promise<Record<string, AnySceneDefinition>> {
  const ids = Object.keys(sceneRegistry);
  const loaded = await Promise.all(ids.map(loadScene));
  return Object.fromEntries(ids.map((id, i) => [id, loaded[i]!]));
}
