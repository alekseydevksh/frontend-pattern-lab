'use client';

import type { ComponentType } from 'react';
import type { AnySceneDefinition } from '@/engine/types';
import { LessonShell, type LessonShellProps } from './LessonShell';

/** What a lesson page gives the lesson view: everything the shell takes except the scene. */
export type LessonViewProps = Omit<LessonShellProps, 'scene'>;

/**
 * Turns a scene definition into a lesson view: the shell with that scene already in it. The scene
 * registry loads a scene's file on demand and wraps what it finds with this, so the page never
 * needs the scene before it renders (see `scenes/registry.ts`).
 */
export function bindScene(scene: AnySceneDefinition): ComponentType<LessonViewProps> {
  function BoundLesson(props: LessonViewProps) {
    return <LessonShell {...props} scene={scene} />;
  }
  return BoundLesson;
}
