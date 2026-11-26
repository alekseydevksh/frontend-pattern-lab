import type { Clock } from './clock';

export interface TimelineEvent {
  /** Milliseconds from the start of the timeline. */
  at: number;
  run: () => void;
}

export interface Timeline {
  /** Begins at elapsed time 0. Even events at 0 run from a timer, never synchronously. */
  start(): void;
  /** Stores the elapsed time and stops the timer. No event runs while paused. */
  pause(): void;
  /** Continues from the stored elapsed time. Does nothing unless paused. */
  resume(): void;
  /** Drops every event that has not run. A cancelled timeline cannot be restarted. */
  cancel(): void;
}

/**
 * Runs events in order of their `at`, each exactly once.
 *
 * Events sit in a list sorted by `at` (ties keep their given order) with a single pointer to
 * the next one to run, so an event cannot run twice or be skipped, whatever happens to the
 * timer. One timer is armed at a time, for the next event only. When it fires, every event
 * that is due runs in order, which also keeps the order right if the browser delays a timer.
 *
 * Pause stores the elapsed time; resume moves the start so that the same time has elapsed.
 */
export function createTimeline(events: readonly TimelineEvent[], clock: Clock): Timeline {
  const queue = events
    .map((event, index) => ({ ...event, index }))
    .sort((a, b) => a.at - b.at || a.index - b.index);

  let next = 0;
  let startedAt = 0;
  let pausedAt: number | null = null; // elapsed time at the moment of pause
  let handle: unknown = null;
  let cancelled = false;

  const isPaused = () => pausedAt !== null;
  const elapsed = () => Math.max(0, clock.now() - startedAt);

  function disarm() {
    if (handle !== null) clock.clearTimeout(handle);
    handle = null;
  }

  function arm() {
    disarm();
    const upcoming = queue[next];
    if (!upcoming || cancelled || isPaused()) return;
    handle = clock.setTimeout(tick, Math.max(0, upcoming.at - elapsed()));
  }

  function tick() {
    handle = null;
    if (cancelled || isPaused()) return;
    const now = elapsed();
    for (let event = queue[next]; event && event.at <= now; event = queue[next]) {
      next += 1; // advance first: the event is spent even if it throws or pauses us
      event.run();
      if (cancelled || isPaused()) return;
    }
    arm();
  }

  return {
    start() {
      startedAt = clock.now();
      arm();
    },
    pause() {
      if (cancelled || isPaused()) return;
      pausedAt = elapsed();
      disarm();
    },
    resume() {
      if (cancelled || pausedAt === null) return;
      startedAt = clock.now() - pausedAt;
      pausedAt = null;
      arm();
    },
    cancel() {
      cancelled = true;
      disarm();
    },
  };
}
