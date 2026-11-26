/**
 * Saved progress: for each lesson, the furthest step reached, the takeaways ticked and whether
 * the lesson was completed. Kept in `localStorage` under one key.
 *
 * The logic is plain functions, apart from React, so it can be unit tested. Storage can be
 * missing, full, blocked or hold anything at all (another tab, an older version, a person
 * with dev tools), so every access is wrapped and everything read back is validated. Nothing
 * here throws: when storage fails, progress simply is not remembered.
 */

export const PROGRESS_STORAGE_KEY = 'pl-progress';
/** Fired on `window` after this tab writes, since the `storage` event only reaches other tabs. */
export const PROGRESS_EVENT = 'pl-progress-change';

const VERSION = 1;

export interface LessonProgress {
  /** The furthest step reached, counting from 0. */
  step: number;
  /** Indexes of the takeaways ticked, ascending. */
  ticked: number[];
  /** True once the last step has been reached. It stays true if the learner goes back. */
  completed: boolean;
}

export type ProgressMap = Readonly<Record<string, LessonProgress>>;

/** What progress needs to know about a lesson. A full `Lesson` fits. */
export interface ProgressLesson {
  slug: string;
  takeaways: readonly string[];
  steps: ReadonlyArray<{ takeawayIndex: number }>;
}

export const emptyProgress: ProgressMap = Object.freeze({});

const isIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Reads the stored text back into a map. Anything malformed is dropped, never thrown. */
export function parseProgress(raw: string | null | undefined): ProgressMap {
  if (!raw) return emptyProgress;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress;
  }
  if (typeof data !== 'object' || data === null) return emptyProgress;
  const { v, lessons } = data as { v?: unknown; lessons?: unknown };
  if (v !== VERSION || typeof lessons !== 'object' || lessons === null) return emptyProgress;

  const entries: Array<[string, LessonProgress]> = [];
  for (const [slug, value] of Object.entries(lessons)) {
    if (typeof value !== 'object' || value === null) continue;
    const { step, ticked, completed } = value as Record<string, unknown>;
    if (!isIndex(step) || !Array.isArray(ticked) || typeof completed !== 'boolean') continue;
    entries.push([
      slug,
      { step, ticked: [...new Set(ticked.filter(isIndex))].sort((a, b) => a - b), completed },
    ]);
  }
  return Object.fromEntries(entries);
}

export function serializeProgress(progress: ProgressMap): string {
  return JSON.stringify({ v: VERSION, lessons: progress });
}

/** Fits saved values to the lesson as it is now, in case the lesson has changed since. */
export function progressFor(
  progress: ProgressMap,
  lesson: ProgressLesson,
): LessonProgress | undefined {
  const saved = Object.hasOwn(progress, lesson.slug) ? progress[lesson.slug] : undefined;
  if (!saved) return undefined;
  const last = Math.max(lesson.steps.length - 1, 0);
  return {
    step: Math.min(saved.step, last),
    ticked: saved.ticked.filter((i) => i < lesson.takeaways.length),
    completed: saved.completed,
  };
}

/** The takeaways ticked by the steps up to and including `furthest`. */
export function takeawaysUpTo(lesson: ProgressLesson, furthest: number): number[] {
  const indexes = lesson.steps.slice(0, furthest + 1).map((s) => s.takeawayIndex);
  return [...new Set(indexes)].sort((a, b) => a - b);
}

/**
 * The progress after the learner has been on step `stepIndex`. Progress only moves forward:
 * going back to an earlier step changes nothing. Returns the same map when nothing changed.
 */
export function recordStep(
  progress: ProgressMap,
  lesson: ProgressLesson,
  stepIndex: number,
): ProgressMap {
  if (lesson.steps.length === 0 || !Number.isFinite(stepIndex)) return progress;
  const last = lesson.steps.length - 1;
  const reached = Math.min(Math.max(Math.trunc(stepIndex), 0), last);
  const before = progressFor(progress, lesson);

  const step = Math.max(before?.step ?? 0, reached);
  const ticked = [...new Set([...(before?.ticked ?? []), ...takeawaysUpTo(lesson, step)])].sort(
    (a, b) => a - b,
  );
  const completed = (before?.completed ?? false) || step === last;

  if (
    before &&
    before.step === step &&
    before.completed === completed &&
    before.ticked.length === ticked.length
  ) {
    return progress;
  }
  return { ...progress, [lesson.slug]: { step, ticked, completed } };
}

/* ---------- where the learner is, for a catalog card ---------- */

export type ProgressState =
  | { kind: 'none' }
  | { kind: 'started'; step: number; stepCount: number }
  | { kind: 'completed'; stepCount: number };

/** What a catalog card says about a lesson. `step` counts from 1. */
export function progressState(
  progress: ProgressMap,
  lesson: ProgressLesson | undefined,
): ProgressState {
  const saved = lesson ? progressFor(progress, lesson) : undefined;
  if (!lesson || !saved) return { kind: 'none' };
  const stepCount = lesson.steps.length;
  if (saved.completed) return { kind: 'completed', stepCount };
  return { kind: 'started', step: saved.step + 1, stepCount };
}

/* ---------- storage ---------- */

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Reading `window.localStorage` can itself throw, for example when cookies are blocked. */
function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored text, or null when there is none or storage is unavailable. */
export function readRawProgress(storage: ReadableStorage | null = browserStorage()): string | null {
  try {
    return storage?.getItem(PROGRESS_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readProgress(storage: ReadableStorage | null = browserStorage()): ProgressMap {
  return parseProgress(readRawProgress(storage));
}

/** Writes the map. Returns false when storage refused, which is not an error. */
export function writeProgress(
  progress: ProgressMap,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(progress));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remembers that the learner reached `stepIndex` of `lesson`, and tells this tab's listeners.
 * Reads before it writes, so a second tab's progress on another lesson is not overwritten.
 */
export function saveStep(
  lesson: ProgressLesson,
  stepIndex: number,
  storage: WritableStorage | null = browserStorage(),
): void {
  const before = readProgress(storage);
  const after = recordStep(before, lesson, stepIndex);
  if (after === before) return;
  if (writeProgress(after, storage) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }
}

/** Calls `onChange` when progress changes in this tab or another. Returns an unsubscribe. */
export function subscribeToProgress(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // `key` is null when storage was cleared.
    if (event.key === null || event.key === PROGRESS_STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(PROGRESS_EVENT, onChange);
  };
}
