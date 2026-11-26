import type { CatalogEntry } from '@/engine/types';

/**
 * The catalog: one entry for each of the twelve lessons in the spec table, ready or not. The
 * position in the list is the lesson number. A lesson that can be played is `ready` and also
 * has a `Lesson` in index.ts with the same slug, title, summary and track; one that is not is
 * `soon` and has no `Lesson`, so there are never fake steps. catalog.test.ts holds the two
 * lists together.
 *
 * Adding a lesson flips its entry from `soon` to `ready`; the slug and text stay as they are.
 */
export const catalog: readonly CatalogEntry[] = [
  {
    slug: 'optimistic-ui',
    title: 'Optimistic UI',
    summary:
      'Update the screen first, confirm with the server second, and undo cleanly when the server says no.',
    track: 'Data and state',
    status: 'ready',
  },
  {
    slug: 'push-pull-sync',
    title: 'Push + Pull Sync',
    summary: 'Load with requests, stay fresh with events, and recover when the connection drops.',
    track: 'Data and state',
    status: 'ready',
  },
  {
    slug: 'virtualization',
    title: 'Virtualization',
    summary:
      'Render only the rows a reader can see, and keep the scrollbar honest while the list stays long.',
    track: 'Rendering and performance',
    status: 'soon',
  },
  {
    slug: 'normalized-data',
    title: 'Normalized Data',
    summary: 'Store each thing once, by id, so one change reaches every screen that shows it.',
    track: 'Data and state',
    status: 'soon',
  },
  {
    slug: 'rendering-isolation',
    title: 'Rendering Isolation',
    summary: 'Stop a small change from re-rendering a whole tree by deciding where state lives.',
    track: 'Rendering and performance',
    status: 'soon',
  },
  {
    slug: 'state-ownership',
    title: 'State Ownership',
    summary: 'Sort state into five kinds, give each a home, and let updates travel one way.',
    track: 'Data and state',
    status: 'soon',
  },
  {
    slug: 'requirements-first',
    title: 'Requirements First and Component Boundaries',
    summary:
      'Start from what the product must do and survive, then draw component layers around responsibilities.',
    track: 'Structure',
    status: 'soon',
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
