import type { CatalogEntry } from '@/engine/types';

/** A lesson that can be played. It also says how long it is, so the catalog needs no lesson data. */
export type ReadyEntry = CatalogEntry & { status: 'ready'; minutes: number; stepCount: number };
export type SoonEntry = CatalogEntry & { status: 'soon' };
export type CatalogRow = ReadyEntry | SoonEntry;

/**
 * The catalog: one entry for each of the twelve lessons in the spec table, ready or not. The
 * position in the list is the lesson number. It is all the catalog page, the sitemap and the
 * "next lesson" button load: no lesson data and no scene.
 *
 * A lesson that can be played is `ready`, has a loader in index.ts, and repeats its slug, title,
 * summary, track, minutes and step count here; one that is not is `soon` and has no `Lesson`, so
 * there are never fake steps. catalog.test.ts holds the two together.
 *
 * Adding a lesson flips its entry from `soon` to `ready` and adds `minutes` and `stepCount`; the
 * slug and text stay as they are.
 */
export const catalog: readonly CatalogRow[] = [
  {
    slug: 'optimistic-ui',
    title: 'Optimistic UI',
    summary:
      'Update the screen first, confirm with the server second, and undo cleanly when the server says no.',
    track: 'Data and state',
    status: 'ready',
    minutes: 4,
    stepCount: 6,
  },
  {
    slug: 'push-pull-sync',
    title: 'Push + Pull Sync',
    summary: 'Load with requests, stay fresh with events, and recover when the connection drops.',
    track: 'Data and state',
    status: 'ready',
    minutes: 5,
    stepCount: 7,
  },
  {
    slug: 'virtualization',
    title: 'Virtualization',
    summary:
      'Render only the rows a reader can see, and keep the scrollbar honest while the list stays long.',
    track: 'Rendering and performance',
    status: 'ready',
    minutes: 5,
    stepCount: 7,
  },
  {
    slug: 'normalized-data',
    title: 'Normalized Data',
    summary: 'Store each thing once, by id, so one change reaches every screen that shows it.',
    track: 'Data and state',
    status: 'ready',
    minutes: 5,
    stepCount: 6,
  },
  {
    slug: 'rendering-isolation',
    title: 'Rendering Isolation',
    summary: 'Stop a small change from re-rendering a whole tree by deciding where state lives.',
    track: 'Rendering and performance',
    status: 'ready',
    minutes: 5,
    stepCount: 6,
  },
  {
    slug: 'state-ownership',
    title: 'State Ownership',
    summary: 'Sort state into five kinds, give each a home, and let updates travel one way.',
    track: 'Data and state',
    status: 'ready',
    minutes: 5,
    stepCount: 6,
  },
  {
    slug: 'requirements-first',
    title: 'Requirements First and Component Boundaries',
    summary:
      'Start from what the product must do and survive, then draw component layers around responsibilities.',
    track: 'Structure',
    status: 'ready',
    minutes: 5,
    stepCount: 6,
  },
  {
    slug: 'container-view-viewmodel',
    title: 'Container, View, ViewModel',
    summary: 'Separate fetching, translating and drawing so each part can change on its own.',
    track: 'Structure',
    status: 'soon',
  },
  {
    slug: 'backend-for-frontend',
    title: 'Backend for Frontend',
    summary: 'Replace a dashboard’s pile of requests with one endpoint shaped like the screen.',
    track: 'Data and state',
    status: 'soon',
  },
  {
    slug: 'progressive-rendering',
    title: 'Progressive Rendering',
    summary: 'Show the most useful content first and let the rest fill in without moving the page.',
    track: 'Rendering and performance',
    status: 'soon',
  },
  {
    slug: 'permission-aware-ui',
    title: 'Permission-Aware UI',
    summary:
      'Show each person what they can do at every layer, and design the case where they cannot.',
    track: 'Product reliability',
    status: 'soon',
  },
  {
    slug: 'errors-and-observability',
    title: 'Errors and Observability',
    summary: 'Plan for loading, empty, error and retry, and watch what production tells you.',
    track: 'Product reliability',
    status: 'soon',
  },
];

/** The lesson's number, counting the whole catalog: 1 for the first, 12 for the last. */
export function lessonNumber(slug: string): number | null {
  const index = catalog.findIndex((entry) => entry.slug === slug);
  return index === -1 ? null : index + 1;
}

/** The lessons that can be played, in lesson order. */
export const readyEntries: readonly ReadyEntry[] = catalog.filter(
  (entry): entry is ReadyEntry => entry.status === 'ready',
);

/**
 * The playable lesson that follows `slug`, or null on the last one. A lesson that is only a
 * catalog entry ("coming soon") is never the next lesson, because there is nothing to open.
 */
export function nextLessonAfter(slug: string): ReadyEntry | null {
  const index = readyEntries.findIndex((entry) => entry.slug === slug);
  return index === -1 ? null : (readyEntries[index + 1] ?? null);
}
