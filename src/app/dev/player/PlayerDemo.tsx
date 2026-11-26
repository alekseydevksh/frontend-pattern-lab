'use client';

import { dummyLesson } from '@content/dev/dummy-lesson';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { LessonShell } from '@/components/lesson/LessonShell';
import { dummyScene } from '@/components/scenes/dev/DummyScene';

/**
 * The player test page: the dummy lesson, played by the same lesson shell the real lessons
 * use. It is the smallest page that runs the whole pipeline (lesson data, player, scene) and
 * is what the end-to-end test drives with the keyboard. The scene is passed in because the
 * dummy lesson is not in the scene registry.
 */
export function PlayerDemo() {
  return (
    <LessonShell
      lesson={dummyLesson}
      scene={dummyScene}
      header={<LessonHeader lesson={dummyLesson} />}
    />
  );
}
