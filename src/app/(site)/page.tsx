import messages from '@messages/en.json';
import { catalog } from '@content/lessons/catalog';
import { LessonCard } from '@/components/catalog/LessonCard';
import { MAIN_ID } from '@/components/shell/SiteShell';
import { format } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';

const text = messages.home;

export const metadata = pageMetadata({ description: messages.site.description, path: '/' });

const LIST_ID = 'catalog-title';

/**
 * The catalog: every lesson of the spec table in one list, in lesson order, numbered 1 to 12,
 * with its track as a label on the card (D14). It is built on the server from the catalog
 * entries alone, with no lesson data and no scene, so it ships almost no JavaScript of its own;
 * a lesson that is not ready shows as "coming soon". Each ready card has a small client part
 * that shows saved progress.
 */
export default function CatalogPage() {
  const ready = catalog.filter((entry) => entry.status === 'ready').length;

  return (
    <main id={MAIN_ID} className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4">
      <header className="max-w-[64ch]">
        <h1 className="font-display text-h1 font-extrabold tracking-tight text-balance">
          {text.heading}
        </h1>
        <p className="mt-3 text-muted-text">{text.intro}</p>
        <p className="mt-2 font-mono text-meta font-medium text-ink">
          {format(text.count, { ready, total: catalog.length })}
        </p>
      </header>

      <section aria-labelledby={LIST_ID}>
        <h2 id={LIST_ID} className="sr-only">
          {text.title}
        </h2>
        <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4 p-0">
          {catalog.map((entry, index) => (
            <li key={entry.slug} className="flex">
              <LessonCard
                number={index + 1}
                slug={entry.slug}
                title={entry.title}
                summary={entry.summary}
                track={entry.track}
                playable={
                  entry.status === 'ready'
                    ? { minutes: entry.minutes, stepCount: entry.stepCount }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
