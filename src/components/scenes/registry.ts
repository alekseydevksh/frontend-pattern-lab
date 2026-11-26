import type { AnySceneDefinition } from '@/engine/types';

/**
 * Maps a lesson's `sceneId` to its scene definition. Adding a lesson adds one line here.
 * Empty until M3, which ports the first two scenes.
 */
export const scenes: Readonly<Record<string, AnySceneDefinition>> = {};
