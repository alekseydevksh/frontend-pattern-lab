import type { Lesson, Step } from './types';

/**
 * Pure state helpers. The scene state is only ever replaced, never changed in place, so the
 * lesson data (which may be frozen) is safe to share between runs.
 */

/**
 * Applies a patch. It is shallow: every field in the patch replaces the field of the same
 * name whole, so an array or an object in a patch is never merged with the old one. Fields
 * the patch does not name are left as they were.
 */
export function patchState<S>(state: S, patch: Partial<S> | undefined): S {
  return patch ? (Object.assign({}, state, patch) as S) : state;
}

/** The state a step begins with: `baseState` with the step's `startState` merged over it. */
export function startStateOf<S>(lesson: Lesson<S>, step: Step<S>): S {
  return patchState(lesson.baseState, step.startState);
}

/** The state a step ends with: its start state with every frame's patch applied in order. */
export function finalStateOf<S>(lesson: Lesson<S>, step: Step<S>): S {
  return step.frames.reduce(
    (state, frame) => patchState(state, frame.set),
    startStateOf(lesson, step),
  );
}

/** The step at `index`. A lesson without that step is a programming error, so it throws. */
export function stepAt<S>(lesson: Lesson<S>, index: number): Step<S> {
  const step = lesson.steps[index];
  if (!step) throw new Error(`Lesson "${lesson.slug}" has no step ${index}.`);
  return step;
}
