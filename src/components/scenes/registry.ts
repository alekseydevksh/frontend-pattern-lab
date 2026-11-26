import type { AnySceneDefinition } from '@/engine/types';
import { optimisticUiScene } from './OptimisticUiScene';
import { pushPullScene } from './PushPullScene';

/**
 * Maps a lesson's `sceneId` to its scene definition. Adding a lesson adds one import and one
 * line here.
 */
export const scenes: Readonly<Record<string, AnySceneDefinition>> = {
  'optimistic-ui': optimisticUiScene,
  'push-pull-sync': pushPullScene,
};
