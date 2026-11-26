import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const hasMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

const getSnapshot = () => hasMatchMedia() && window.matchMedia(QUERY).matches;

/** The server cannot know the preference, so it renders (and hydrates) the full-motion case. */
const getServerSnapshot = () => false;

/** True while the visitor prefers reduced motion, and follows changes to the setting. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
