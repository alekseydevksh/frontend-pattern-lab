import { describe, expect, it, vi } from 'vitest';
import { realClock } from './clock';
import { createManualClock } from './testClock';
import { createTimeline, type Timeline, type TimelineEvent } from './timeline';

/** Builds events that log their own name and the clock time they ran at. */
function logging(clock: { now(): number }, spec: Array<[name: string, at: number]>) {
  const log: Array<[string, number]> = [];
  const events: TimelineEvent[] = spec.map(([name, at]) => ({
    at,
    run: () => log.push([name, clock.now()]),
  }));
  return { log, events };
}

describe('createTimeline: scheduling', () => {
  it('runs events at their time, in order of `at`, not in the order given', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['c', 900],
      ['a', 100],
      ['b', 400],
    ]);
    createTimeline(events, clock).start();
    clock.advance(1000);
    expect(log).toEqual([
      ['a', 100],
      ['b', 400],
      ['c', 900],
    ]);
  });

  it('runs nothing early', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [['a', 300]]);
    createTimeline(events, clock).start();
    clock.advance(299);
    expect(log).toEqual([]);
    clock.advance(1);
    expect(log).toEqual([['a', 300]]);
  });

  it('keeps the given order for events that share a time', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['first', 200],
      ['second', 200],
      ['third', 200],
    ]);
    createTimeline(events, clock).start();
    clock.advance(200);
    expect(log.map(([name]) => name)).toEqual(['first', 'second', 'third']);
  });

  it('never runs an event at time 0 synchronously', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [['now', 0]]);
    createTimeline(events, clock).start();
    expect(log).toEqual([]);
    clock.advance(0);
    expect(log).toEqual([['now', 0]]);
  });

  it('arms one timer at a time, for the next event only', () => {
    const clock = createManualClock();
    const { events } = logging(clock, [
      ['a', 100],
      ['b', 200],
      ['c', 300],
    ]);
    createTimeline(events, clock).start();
    expect(clock.pending()).toBe(1);
    clock.advance(100);
    expect(clock.pending()).toBe(1);
    clock.advance(200);
    expect(clock.pending()).toBe(0);
  });

  it('runs every overdue event, in order, when a timer fires late', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['a', 100],
      ['b', 150],
      ['c', 180],
      ['d', 500],
    ]);
    createTimeline(events, clock).start();
    // A busy page: the first timer is not serviced until time 200.
    clock.advance(200);
    expect(log.map(([name]) => name)).toEqual(['a', 'b', 'c']);
    clock.advance(300);
    expect(log.map(([name]) => name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does nothing for an empty list', () => {
    const clock = createManualClock();
    createTimeline([], clock).start();
    expect(clock.pending()).toBe(0);
  });
});

describe('createTimeline: pause and resume', () => {
  it('runs each event exactly once across a pause, in order, none skipped', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['a', 100],
      ['b', 300],
      ['c', 500],
      ['d', 700],
    ]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    clock.advance(400); // a and b have run
    timeline.pause();
    clock.advance(10_000); // a long time passes while paused
    expect(log.map(([name]) => name)).toEqual(['a', 'b']);
    timeline.resume();
    clock.advance(100); // elapsed is 500 again: c is due
    expect(log.map(([name]) => name)).toEqual(['a', 'b', 'c']);
    clock.advance(1000);
    expect(log.map(([name]) => name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('continues with the time that was left, not the full delay', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [['a', 1000]]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    clock.advance(600);
    timeline.pause();
    clock.advance(5000); // clock is now at 5600
    timeline.resume();
    clock.advance(399);
    expect(log).toEqual([]);
    clock.advance(1);
    expect(log).toEqual([['a', 6000]]); // 400 ms after resuming, not 1000
  });

  it('survives many pauses and resumes', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['a', 100],
      ['b', 200],
      ['c', 300],
    ]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    for (let i = 0; i < 30; i += 1) {
      clock.advance(10);
      timeline.pause();
      clock.advance(77);
      timeline.resume();
    }
    expect(log.map(([name]) => name)).toEqual(['a', 'b', 'c']);
  });

  it('runs an event that was already due when the pause came, once, on resume', () => {
    const manual = createManualClock();
    // A page that services timers 50 ms late.
    const clock = {
      ...manual,
      setTimeout: (cb: () => void, ms: number) => manual.setTimeout(cb, ms + 50),
    };
    const { log, events } = logging(manual, [['a', 300]]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    manual.advance(320); // past 300, but the late timer is due at 350
    timeline.pause();
    expect(log).toEqual([]);
    timeline.resume();
    manual.advance(1000);
    expect(log.map(([name]) => name)).toEqual(['a']);
  });

  it('ignores resume when not paused, and pause twice', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['a', 100],
      ['b', 200],
    ]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    timeline.resume(); // not paused: must not arm a second timer
    expect(clock.pending()).toBe(1);
    clock.advance(50);
    timeline.pause();
    timeline.pause();
    clock.advance(500);
    timeline.resume();
    timeline.resume();
    expect(clock.pending()).toBe(1);
    clock.advance(500);
    expect(log.map(([name]) => name)).toEqual(['a', 'b']);
  });

  it('does not run anything while paused, even if time moves', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [['a', 100]]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    timeline.pause();
    expect(clock.pending()).toBe(0);
    clock.advance(10_000);
    expect(log).toEqual([]);
  });

  it('can be paused from inside an event, and the rest waits', () => {
    const clock = createManualClock();
    const log: string[] = [];
    const timeline: Timeline = createTimeline(
      [
        {
          at: 100,
          run: () => {
            log.push('a');
            timeline.pause();
          },
        },
        { at: 100, run: () => log.push('b') },
        { at: 400, run: () => log.push('c') },
      ],
      clock,
    );
    timeline.start();
    clock.advance(1000);
    expect(log).toEqual(['a']);
    timeline.resume();
    clock.advance(0);
    expect(log).toEqual(['a', 'b']);
    clock.advance(300);
    expect(log).toEqual(['a', 'b', 'c']);
  });
});

describe('createTimeline: cancel', () => {
  it('drops the events that have not run and clears the timer', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [
      ['a', 100],
      ['b', 300],
    ]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    clock.advance(150);
    timeline.cancel();
    expect(clock.pending()).toBe(0);
    clock.advance(1000);
    expect(log.map(([name]) => name)).toEqual(['a']);
  });

  it('cannot be resumed after a cancel', () => {
    const clock = createManualClock();
    const { log, events } = logging(clock, [['a', 100]]);
    const timeline = createTimeline(events, clock);
    timeline.start();
    timeline.pause();
    timeline.cancel();
    timeline.resume();
    clock.advance(1000);
    expect(log).toEqual([]);
  });
});

describe('the real clock', () => {
  it('follows fake timers, so the default clock needs no change in tests', () => {
    vi.useFakeTimers();
    try {
      const ran: string[] = [];
      createTimeline(
        [
          { at: 200, run: () => ran.push('a') },
          { at: 700, run: () => ran.push('b') },
        ],
        realClock,
      ).start();
      vi.advanceTimersByTime(199);
      expect(ran).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(ran).toEqual(['a']);
      vi.advanceTimersByTime(500);
      expect(ran).toEqual(['a', 'b']);
    } finally {
      vi.useRealTimers();
    }
  });
});
