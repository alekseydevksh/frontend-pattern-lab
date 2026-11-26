import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROGRESS_EVENT,
  PROGRESS_STORAGE_KEY,
  emptyProgress,
  parseProgress,
  progressFor,
  progressState,
  readProgress,
  recordStep,
  saveStep,
  serializeProgress,
  subscribeToProgress,
  takeawaysUpTo,
  writeProgress,
  type ProgressLesson,
  type ProgressMap,
} from './progress';

/** Six steps, four takeaways: steps 0 and 1 tick takeaway 0, then one each. */
const lesson: ProgressLesson = {
  slug: 'demo',
  takeaways: ['a', 'b', 'c', 'd'],
  steps: [0, 0, 1, 2, 3, 3].map((takeawayIndex) => ({ takeawayIndex })),
};

/** An in-memory stand-in for `localStorage`. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const stored = (progress: ProgressMap) => ({
  [PROGRESS_STORAGE_KEY]: serializeProgress(progress),
});

describe('parseProgress', () => {
  it('reads back what serializeProgress wrote', () => {
    const progress: ProgressMap = { demo: { step: 2, ticked: [0, 1], completed: false } };
    expect(parseProgress(serializeProgress(progress))).toEqual(progress);
  });

  it('gives nothing for missing, empty or unreadable text', () => {
    for (const raw of [null, undefined, '', 'not json', '{', '[]', 'null', '42', '"x"']) {
      expect(parseProgress(raw), String(raw)).toEqual({});
    }
  });

  it('gives nothing for a different version or shape', () => {
    expect(parseProgress('{"v":2,"lessons":{}}')).toEqual({});
    expect(parseProgress('{"v":1}')).toEqual({});
    expect(parseProgress('{"v":1,"lessons":[]}')).toEqual({});
    expect(parseProgress('{"v":1,"lessons":"x"}')).toEqual({});
  });

  it('drops an entry with bad values and keeps the good ones', () => {
    const raw = JSON.stringify({
      v: 1,
      lessons: {
        good: { step: 1, ticked: [0], completed: true },
        negative: { step: -1, ticked: [], completed: false },
        fraction: { step: 1.5, ticked: [], completed: false },
        text: { step: '2', ticked: [], completed: false },
        noTicks: { step: 1, completed: false },
        noFlag: { step: 1, ticked: [] },
        nothing: null,
        number: 7,
      },
    });
    expect(Object.keys(parseProgress(raw))).toEqual(['good']);
  });

  it('cleans the ticked list: whole numbers only, no repeats, in order', () => {
    const raw = JSON.stringify({
      v: 1,
      lessons: { demo: { step: 3, ticked: [3, 1, 1, -2, 0.5, 'x', null, 0], completed: false } },
    });
    expect(parseProgress(raw).demo?.ticked).toEqual([0, 1, 3]);
  });

  it('does not let a key such as __proto__ reach the prototype', () => {
    const raw =
      '{"v":1,"lessons":{"__proto__":{"step":1,"ticked":[],"completed":false,"polluted":true}}}';
    const parsed = parseProgress(raw);
    expect(({} as Record<string, unknown>).step).toBeUndefined();
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });
});

describe('progressFor', () => {
  it('is undefined for a lesson never started', () => {
    expect(progressFor(emptyProgress, lesson)).toBeUndefined();
    expect(progressFor({}, { ...lesson, slug: 'toString' })).toBeUndefined();
  });

  it('fits stored values to the lesson as it is now', () => {
    const progress = { demo: { step: 40, ticked: [0, 3, 9], completed: false } };
    expect(progressFor(progress, lesson)).toEqual({ step: 5, ticked: [0, 3], completed: false });
  });
});

describe('takeawaysUpTo', () => {
  it('lists the takeaways of the steps reached, once each', () => {
    expect(takeawaysUpTo(lesson, 0)).toEqual([0]);
    expect(takeawaysUpTo(lesson, 1)).toEqual([0]);
    expect(takeawaysUpTo(lesson, 3)).toEqual([0, 1, 2]);
    expect(takeawaysUpTo(lesson, 5)).toEqual([0, 1, 2, 3]);
  });
});

describe('recordStep', () => {
  it('starts a lesson at the step reached', () => {
    expect(recordStep({}, lesson, 0)).toEqual({
      demo: { step: 0, ticked: [0], completed: false },
    });
    expect(recordStep({}, lesson, 3)).toEqual({
      demo: { step: 3, ticked: [0, 1, 2], completed: false },
    });
  });

  it('only moves forward: going back changes nothing', () => {
    const at4 = recordStep({}, lesson, 4);
    expect(recordStep(at4, lesson, 1)).toBe(at4);
    expect(recordStep(at4, lesson, 4)).toBe(at4);
  });

  it('completes the lesson on the last step, and stays complete', () => {
    const done = recordStep(recordStep({}, lesson, 2), lesson, 5);
    expect(done.demo).toEqual({ step: 5, ticked: [0, 1, 2, 3], completed: true });
    expect(recordStep(done, lesson, 0)).toBe(done);
  });

  it('keeps the other lessons', () => {
    const other = { other: { step: 1, ticked: [0], completed: false } };
    expect(recordStep(other, lesson, 1).other).toEqual(other.other);
  });

  it('clamps a step outside the lesson and ignores one that is not a number', () => {
    expect(recordStep({}, lesson, 99).demo?.step).toBe(5);
    expect(recordStep({}, lesson, -3).demo?.step).toBe(0);
    const empty: ProgressMap = {};
    expect(recordStep(empty, lesson, Number.NaN)).toBe(empty);
  });

  it('does nothing for a lesson without steps', () => {
    const empty: ProgressMap = {};
    expect(recordStep(empty, { ...lesson, steps: [] }, 0)).toBe(empty);
  });

  it('keeps ticks that were saved earlier', () => {
    const before = { demo: { step: 1, ticked: [3], completed: false } };
    expect(recordStep(before, lesson, 2).demo?.ticked).toEqual([0, 1, 3]);
  });

  it('does not mutate the map it was given', () => {
    const before: ProgressMap = { demo: { step: 1, ticked: [0], completed: false } };
    const snapshot = JSON.stringify(before);
    recordStep(before, lesson, 4);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('progressState', () => {
  const card = { slug: 'demo', stepCount: 6 };

  it('is none for a lesson that is not ready or not started', () => {
    expect(progressState({}, undefined)).toEqual({ kind: 'none' });
    expect(progressState({}, card)).toEqual({ kind: 'none' });
    expect(progressState({}, { slug: 'toString', stepCount: 6 })).toEqual({ kind: 'none' });
  });

  it('counts the step from 1 while the lesson is in progress', () => {
    expect(progressState(recordStep({}, lesson, 2), card)).toEqual({
      kind: 'started',
      step: 3,
      stepCount: 6,
    });
  });

  it('is completed once the last step has been reached', () => {
    expect(progressState(recordStep({}, lesson, 5), card)).toEqual({
      kind: 'completed',
      stepCount: 6,
    });
  });

  it('clamps a saved step beyond the end of a lesson that got shorter', () => {
    const saved = { demo: { step: 9, ticked: [], completed: false } };
    expect(progressState(saved, card)).toEqual({ kind: 'started', step: 6, stepCount: 6 });
  });
});

describe('storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves a step and reads it back', () => {
    const storage = memoryStorage();
    saveStep(lesson, 2, storage);
    expect(readProgress(storage).demo).toEqual({ step: 2, ticked: [0, 1], completed: false });
  });

  it('adds to what other lessons have stored instead of replacing it', () => {
    const storage = memoryStorage(stored({ other: { step: 3, ticked: [0, 1], completed: false } }));
    saveStep(lesson, 1, storage);
    const progress = readProgress(storage);
    expect(Object.keys(progress).sort()).toEqual(['demo', 'other']);
  });

  it('does not write when nothing changed', () => {
    const storage = memoryStorage();
    saveStep(lesson, 3, storage);
    const setItem = vi.spyOn(storage, 'setItem');
    saveStep(lesson, 1, storage);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('survives storage that throws on read', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
    };
    expect(readProgress(storage)).toEqual({});
    expect(() => saveStep(lesson, 1, storage)).not.toThrow();
  });

  it('survives storage that throws on write, such as a full disk', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(writeProgress({ demo: { step: 1, ticked: [], completed: false } }, storage)).toBe(false);
    expect(() => saveStep(lesson, 1, storage)).not.toThrow();
  });

  it('survives a missing storage object', () => {
    expect(readProgress(null)).toEqual({});
    expect(writeProgress({}, null)).toBe(false);
    expect(() => saveStep(lesson, 1, null)).not.toThrow();
  });

  it('survives stored text that is not valid progress', () => {
    const storage = memoryStorage({ [PROGRESS_STORAGE_KEY]: '{"v":1,"lessons":{"demo":5}}' });
    expect(readProgress(storage)).toEqual({});
    saveStep(lesson, 1, storage);
    expect(readProgress(storage).demo?.step).toBe(1);
  });

  it('tells this tab when it has saved something new', () => {
    const storage = memoryStorage();
    const listener = vi.fn();
    const stop = subscribeToProgress(listener);
    saveStep(lesson, 1, storage);
    expect(listener).toHaveBeenCalledTimes(1);
    saveStep(lesson, 1, storage); // nothing new
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    saveStep(lesson, 4, storage);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('listens to other tabs, for this key or a cleared storage, and nothing else', () => {
    const listener = vi.fn();
    const stop = subscribeToProgress(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'pl-theme' }));
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('exports the event name that same-tab writes use', () => {
    expect(PROGRESS_EVENT).toBe('pl-progress-change');
  });
});
