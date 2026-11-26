import messages from '@messages/en.json';
import { catalog } from '@content/lessons/catalog';
import { lessons } from '@content/lessons';
import { LessonCard } from '@/components/catalog/LessonCard';
import { MAIN_ID } from '@/components/shell/SiteShell';
import type { CatalogEntry, Track } from '@/engine/types';
import { format } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';

const text = messages.home;

/** The tracks in the order the catalog introduces them. */
const trackOrder: readonly Track[] = [
  'Data and state',
  'Rendering and performance',
  'Structure',
  'Product reliability',
];

export const metadata = pageMetadata({ description: messages.site.description, path: '/' });

/**
 * The catalog: every lesson of the spec table, grouped by track, in lesson order. Built on the
 * server from catalog entries, so it ships almost no JavaScript; a lesson that is not ready
 * shows as "coming soon". Each ready card has a small client part that shows saved progress.
 */
export default function CatalogPage() {
  const ready = catalog.filter((entry) => entry.status === 'ready').length;
  const numbered = catalog.map((entry, index) => ({ entry, number: index + 1 }));
  const byTrack = trackOrder.map((track) => ({
    track,
    items: numbered.filter(({ entry }) => entry.track === track),
  }));

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

      {byTrack.map(({ track, items }) => (
        <section key={track} aria-labelledby={trackId(track)}>
          <h2
            id={trackId(track)}
            className="mb-3 font-mono text-label font-semibold tracking-caps-wide text-muted-text uppercase"
          >
            {track}
          </h2>
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4 p-0">
            {items.map(({ entry, number }) => (
              <li key={entry.slug} className="flex">
                <LessonCard
                  number={number}
                  slug={entry.slug}
                  title={entry.title}
                  summary={entry.summary}
                  playable={playableOf(entry)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

const trackId = (track: Track) => `track-${track.toLowerCase().replaceAll(' ', '-')}`;

function playableOf(entry: CatalogEntry) {
  if (entry.status !== 'ready') return undefined;
  const lesson = lessons.find((l) => l.slug === entry.slug);
  return lesson ? { minutes: lesson.minutes, stepCount: lesson.steps.length } : undefined;
}
