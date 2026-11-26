import type { Clock } from './clock';

/** A clock that moves only when a test says so. */
export interface ManualClock extends Clock {
  /** Moves time forward, running every timer that falls due, in order. */
  advance(ms: number): void;
  /** Timers that have been set and not yet run or cleared. */
  pending(): number;
}

/**
 * For tests: a deterministic Clock. `advance(ms)` runs timers in order of their due time,
 * and a timer set from inside a timer runs in the same `advance` if it falls due in it.
 */
export function createManualClock(): ManualClock {
  let time = 0;
  let nextId = 1;
  const timers = new Map<number, { due: number; callback: () => void }>();

  return {
    now: () => time,
    setTimeout(callback, ms) {
      const id = nextId++;
      timers.set(id, { due: time + Math.max(0, ms), callback });
      return id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
    pending: () => timers.size,
    advance(ms) {
      const target = time + ms;
      for (;;) {
        let soonest: [number, { due: number; callback: () => void }] | null = null;
        for (const entry of timers) {
          // Earliest due first; the lower id wins a tie, which is the order they were set.
          if (!soonest || entry[1].due < soonest[1].due) soonest = entry;
        }
        if (!soonest || soonest[1].due > target) break;
        const [id, timer] = soonest;
        timers.delete(id);
        time = Math.max(time, timer.due);
        timer.callback();
      }
      time = target;
    },
  };
}
