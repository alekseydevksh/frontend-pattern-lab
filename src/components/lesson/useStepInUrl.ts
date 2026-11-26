'use client';

import { useEffect, useRef } from 'react';
import { parseStepParam, withStepParam } from '@/lib/stepParam';

/**
 * Keeps the lesson's `?step=N` address in step with the player.
 *
 * On load it reads the parameter and moves the player there (a whole number outside the
 * lesson is clamped, anything else is ignored). From then on it rewrites the address as the
 * learner moves, with `history.replaceState`, so stepping through a lesson adds nothing to the
 * back button's history. The first step has no parameter, so the plain lesson address stays
 * the clean one.
 *
 * The parameter is read after hydration, in an effect. A static export cannot know the query
 * string when it builds the page, so the server HTML is always step 1; the page then jumps to
 * the requested step, a moment after it first paints.
 */
export function useStepInUrl(stepIndex: number, stepCount: number, goTo: (index: number) => void) {
  // Set while a jump from the address has been asked for but has not shown yet. Until it does,
  // the address must be left alone: the player still says step 1, and writing that would
  // erase the parameter before the jump.
  const pending = useRef<number | null>(null);
  const read = useRef(false);

  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const wanted = parseStepParam(window.location.search, stepCount);
    if (wanted !== null && wanted !== 0) {
      pending.current = wanted;
      goTo(wanted);
    }
  }, [stepCount, goTo]);

  useEffect(() => {
    if (pending.current !== null) {
      if (stepIndex !== pending.current) return;
      pending.current = null;
    }
    const { pathname, search, hash } = window.location;
    const nextSearch = withStepParam(search, stepIndex);
    if (nextSearch === search) return;
    // Keep the history entry's own state: the Next.js router stores its data in it.
    window.history.replaceState(window.history.state, '', `${pathname}${nextSearch}${hash}`);
  }, [stepIndex]);
}
