import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import messages from '@messages/en.json';
import { lessons } from '@content/lessons';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { LessonShell } from '@/components/lesson/LessonShell';
import { LessonsFrame } from '../LessonsFrame';

/**
 * A lesson page. Temporary in M3: it plays the lesson and nothing else. M4 adds the catalog,
 * `?step=` deep links, saved progress, next-lesson navigation and full page metadata. The
 * header text is rendered here, on the server, and handed to the shell, which is the client
 * part that runs the player.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.filter((lesson) => lesson.status === 'published').map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  return lesson
    ? { title: `${lesson.title} · ${messages.site.name}`, description: lesson.summary }
    : {};
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) notFound();
  return (
    <LessonsFrame current={slug}>
      <LessonShell
        key={slug}
        lesson={lesson}
        header={<LessonHeader lesson={lesson} lessonCount={lessons.length} />}
      />
    </LessonsFrame>
  );
}
