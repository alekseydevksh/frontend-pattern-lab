import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalog } from '@content/lessons/catalog';
import { lessons, nextLessonAfter } from '@content/lessons';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { MAIN_ID } from '@/components/shell/SiteShell';
import { pageMetadata } from '@/lib/metadata';
import { LessonRoute } from './LessonRoute';

/**
 * A lesson page, generated at build time for each lesson in the registry. The header text is
 * rendered here, on the server, and handed to the client part that runs the player.
 * `?step=N` is read in the browser (see useStepInUrl), so one static page serves every step.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  return lesson
    ? pageMetadata({
        title: lesson.title,
        description: lesson.summary,
        path: `/lessons/${lesson.slug}/`,
      })
    : {};
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) notFound();
  const next = nextLessonAfter(slug);
  return (
    <main id={MAIN_ID} className="mx-auto max-w-[1240px] px-4">
      <LessonRoute
        key={slug}
        lesson={lesson}
        header={<LessonHeader lesson={lesson} lessonCount={catalog.length} />}
        next={next ? { title: next.title, href: `/lessons/${next.slug}/` } : null}
      />
    </main>
  );
}
