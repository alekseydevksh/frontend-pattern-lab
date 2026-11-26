'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  emptyProgress,
  parseProgress,
  readRawProgress,
  subscribeToProgress,
  type ProgressMap,
} from './progress';

/** The server has no storage, and neither has the first client render: both see nothing. */
const serverSnapshot = () => null;

/**
 * The saved progress. It is empty on the server and on the first client render, so the page is
 * the same HTML both times; React then switches to the stored value after hydration and
 * re-renders. It follows changes made by this tab and by other tabs. The snapshot is the stored
 * text, so it is stable between renders and a re-render happens only when the text changes.
 */
export function useProgress(): ProgressMap {
  const raw = useSyncExternalStore(subscribeToProgress, readRawProgress, serverSnapshot);
  return useMemo(() => (raw === null ? emptyProgress : parseProgress(raw)), [raw]);
}
