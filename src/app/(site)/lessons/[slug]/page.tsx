import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalog, nextLessonAfter, readyEntries } from '@content/lessons/catalog';
import { loadLesson } from '@content/lessons';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { MAIN_ID } from '@/components/shell/SiteShell';
import { pageMetadata } from '@/lib/metadata';
import { LessonRoute } from './LessonRoute';

/**
 * A lesson page, generated at build time for each ready lesson in the catalog. It loads its own
 * lesson, and the client part (LessonRoute) loads its own scene: the header text is rendered here,
 * on the server, and the browser downloads one scene only. `?step=N` is read in the browser (see useStepInUrl), so one static
 * page serves every step.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return readyEntries.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = readyEntries.find((e) => e.slug === slug);
  return entry
    ? pageMetadata({
        title: entry.title,
        description: entry.summary,
        path: `/lessons/${entry.slug}/`,
      })
    : {};
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = await loadLesson(slug);
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
