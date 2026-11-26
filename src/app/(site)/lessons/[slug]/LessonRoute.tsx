'use client';

import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { sceneEntry } from '@/components/scenes/registry';
import type { AnyLesson } from '@/engine/types';

/**
 * The lesson page's client part. It turns the next lesson's address into the `onOpen` the shell
 * wants, with the router, so the shell itself never depends on Next.js (it is also used in
 * Storybook and in unit tests, which have no router). Everything it is given comes from the
 * server page.
 */
export function LessonRoute({
  lesson,
  header,
  next,
}: {
  lesson: AnyLesson;
  header: ReactNode;
  next: { title: string; href: string } | null;
}) {
  const router = useRouter();
  const nextLesson = useMemo(
    () => (next ? { title: next.title, onOpen: () => router.push(next.href) } : undefined),
    [next, router],
  );
  // The view of this lesson's scene: the shell with the scene loaded on demand (see the registry).
  const { View } = sceneEntry(lesson.sceneId);
  return <View lesson={lesson} header={header} nextLesson={nextLesson} />;
}
