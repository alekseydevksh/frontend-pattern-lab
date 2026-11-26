import { StrictMode, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PACKET_DURATION_MS } from './packets';
import { createManualClock } from './testClock';
import { createTestLesson, testScene, type TestState } from './testLesson';
import { useLessonPlayer, type PlayerOptions } from './useLessonPlayer';
import type { Lesson, SceneDefinition, Step } from './types';

/** Mounts the player with a manual clock, and wraps clock and key changes in act(). */
function setup(options: PlayerOptions = {}, lesson: Lesson<TestState> = createTestLesson()) {
  const clock = createManualClock();
  const hook = renderHook(
    (props: { lesson: Lesson<TestState>; options: PlayerOptions }) =>
      useLessonPlayer(props.lesson, testScene, props.options),
    { initialProps: { lesson, options: { clock, reducedMotion: false, ...options } } },
  );
  return {
    clock,
    lesson,
    hook,
    get player() {
      return hook.result.current;
    },
    advance: (ms: number) => act(() => clock.advance(ms)),
    rerender: (next: { lesson?: Lesson<TestState>; options?: PlayerOptions }) =>
      hook.rerender({
        lesson: next.lesson ?? lesson,
        options: { clock, reducedMotion: false, ...options, ...next.options },
      }),
  };
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('first paint', () => {
  it('shows the start state in full on the first render, before any timer or effect', () => {
    const lesson = createTestLesson();
    const stepTwo = { ...lesson, steps: [lesson.steps[1]!, lesson.steps[0]!, lesson.steps[2]!] };
    function Probe() {
      const player = useLessonPlayer(stepTwo, testScene, {
        clock: createManualClock(),
        reducedMotion: false,
      });
      return <p>{`${player.state.value}|${player.state.count}|${player.stepIndex}`}</p>;
    }
    // renderToString runs no effects and no timers: it is exactly what the server sends.
    expect(renderToString(<Probe />)).toContain('second-start|10|0');
  });

  it('starts at step 0 with base state, unpaused, nothing in flight', () => {
    const t = setup();
    expect(t.player.stepIndex).toBe(0);
    expect(t.player.stepCount).toBe(3);
    expect(t.player.step.id).toBe('first');
    expect(t.player.state).toEqual(t.lesson.baseState);
    expect(t.player.activePackets).toEqual([]);
    expect(t.player.isPaused).toBe(false);
  });

  it('derives the metrics from the scene and the current state', () => {
    const t = setup();
    expect(t.player.metrics).toEqual([
      { value: 'base' },
      { value: '0', tone: 'good' },
      { value: '' },
    ]);
    t.advance(300);
    expect(t.player.metrics[0]).toEqual({ value: 'b' });
    expect(t.player.metrics[2]).toEqual({ value: 'x,y' });
  });
});

describe('scheduling', () => {
  it('applies each frame at its time, in order, and not before', () => {
    const t = setup();
    t.advance(99);
    expect(t.player.state.value).toBe('base');
    t.advance(1);
    expect(t.player.state.value).toBe('a');
    t.advance(199);
    expect(t.player.state.value).toBe('a');
    t.advance(1);
    expect(t.player.state.value).toBe('b');
    expect(t.player.state.items).toEqual(['x', 'y']);
    expect(t.player.state.count).toBe(0);
    t.advance(300);
    expect(t.player.state.count).toBe(1);
  });

  it('runs a frame at time 0 on the first timer turn, then the rest on time', () => {
    const t = setup();
    act(() => t.player.goTo(2));
    expect(t.player.state.value).toBe('base');
    t.advance(0);
    expect(t.player.state.value).toBe('third-0');
    t.advance(499);
    expect(t.player.state.nested).toEqual({ a: 1, b: 1 });
    t.advance(1);
    expect(t.player.state.nested).toEqual({ a: 2, b: 0 });
  });

  it('puts a packet on the lane when its frame runs, and removes it when its time is up', () => {
    const lesson = createTestLesson();
    lesson.steps[0]!.frames = [
      { at: 300, packet: { lane: 'main', label: 'request', tone: 'req' } },
    ];
    const t = setup({}, lesson);
    t.advance(299);
    expect(t.player.activePackets).toEqual([]);
    t.advance(1);
    expect(t.player.activePackets).toHaveLength(1);
    expect(t.player.activePackets[0]).toMatchObject({
      packet: { label: 'request', tone: 'req' },
      lane: { x1: 0, x2: 100, y: 10 },
    });
    t.advance(PACKET_DURATION_MS - 1);
    expect(t.player.activePackets).toHaveLength(1);
    t.advance(1);
    expect(t.player.activePackets).toEqual([]);
  });

  it('can have two packets in flight at once, with different keys', () => {
    const lesson = createTestLesson();
    lesson.steps[0]!.frames = [
      { at: 0, packet: { lane: 'main', label: 'one', tone: 'req' } },
      { at: 100, packet: { lane: 'main', label: 'two', tone: 'ev' } },
    ];
    const t = setup({}, lesson);
    t.advance(100);
    const keys = t.player.activePackets.map((p) => p.key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    t.advance(PACKET_DURATION_MS - 100);
    expect(t.player.activePackets.map((p) => p.packet.label)).toEqual(['two']);
  });

  it('skips a packet whose lane the scene does not define, instead of crashing', () => {
    const lesson = createTestLesson();
    lesson.steps[0]!.frames = [{ at: 0, packet: { lane: 'nowhere', label: 'x', tone: 'req' } }];
    const t = setup({}, lesson);
    t.advance(0);
    expect(t.player.activePackets).toEqual([]);
  });

  it('settles on the final state and an empty lane once the step is over', () => {
    const t = setup();
    t.advance(60_000);
    expect(t.player.state).toEqual({
      value: 'b',
      count: 1,
      items: ['x', 'y'],
      nested: { a: 1, b: 1 },
    });
    expect(t.player.activePackets).toEqual([]);
    expect(t.clock.pending()).toBe(0);
  });
});

describe('pause and resume', () => {
  it('runs each frame exactly once: nothing repeats and nothing is skipped', () => {
    const t = setup();
    t.advance(350); // frames 1 and 2 have run; the packet from frame 2 is in flight
    expect(t.player.state.value).toBe('b');
    act(() => t.player.togglePause());
    expect(t.player.isPaused).toBe(true);
    t.advance(30_000);
    expect(t.player.state.value).toBe('b');
    expect(t.player.state.count).toBe(0);
    act(() => t.player.togglePause());
    expect(t.player.isPaused).toBe(false);
    // Had frame 1 run again it would put value back to 'a' after frame 2 had set 'b'.
    t.advance(0);
    expect(t.player.state.value).toBe('b');
    t.advance(249);
    expect(t.player.state.count).toBe(0); // frame 3 is due at 600, elapsed is 599
    t.advance(1);
    expect(t.player.state.count).toBe(1);
    t.advance(60_000);
    expect(t.player.state).toEqual({
      value: 'b',
      count: 1,
      items: ['x', 'y'],
      nested: { a: 1, b: 1 },
    });
  });

  it('keeps the time that was left, so a pause never stretches or shrinks the step', () => {
    const t = setup();
    t.advance(250);
    act(() => t.player.togglePause());
    t.advance(1_000_000);
    act(() => t.player.togglePause());
    t.advance(49); // elapsed 299: frame 2 is due at 300
    expect(t.player.state.value).toBe('a');
    t.advance(1);
    expect(t.player.state.value).toBe('b');
  });

  it('keeps a packet in flight through a pause, and removes it when its time is up', () => {
    const t = setup();
    t.advance(300 + 400); // packet 1 is 400 ms old; frame 3 (600) has also run
    expect(t.player.activePackets.map((p) => p.packet.label)).toEqual(['request', 'answer']);
    act(() => t.player.togglePause());
    t.advance(60_000);
    expect(t.player.activePackets).toHaveLength(2);
    act(() => t.player.togglePause());
    t.advance(499); // packet 1 expires at 300 + 900 = 1200: elapsed is 1199
    expect(t.player.activePackets).toHaveLength(2);
    t.advance(1);
    expect(t.player.activePackets.map((p) => p.packet.label)).toEqual(['answer']);
    t.advance(300);
    expect(t.player.activePackets).toEqual([]);
  });

  it('survives pausing and resuming over and over', () => {
    const t = setup();
    for (let i = 0; i < 25; i += 1) {
      t.advance(7);
      act(() => t.player.togglePause());
      t.advance(1234);
      act(() => t.player.togglePause());
    }
    t.advance(60_000);
    expect(t.player.state.count).toBe(1);
    expect(t.player.state.value).toBe('b');
  });

  it('pausing before anything has run, then resuming, loses no frame', () => {
    const t = setup();
    act(() => t.player.togglePause());
    t.advance(5000);
    act(() => t.player.togglePause());
    t.advance(100);
    expect(t.player.state.value).toBe('a');
  });

  it('does not stop a step change: another step plays from its own start, unpaused', () => {
    const t = setup();
    t.advance(50);
    act(() => t.player.togglePause());
    act(() => t.player.next());
    expect(t.player.isPaused).toBe(false);
    t.advance(200);
    expect(t.player.state.value).toBe('second-end');
  });
});

describe('replay', () => {
  it('restarts the step from its start state and runs every frame again', () => {
    const t = setup();
    t.advance(700);
    expect(t.player.state.count).toBe(1);
    act(() => t.player.replay());
    expect(t.player.state).toEqual(t.lesson.baseState);
    expect(t.player.activePackets).toEqual([]);
    t.advance(100);
    expect(t.player.state.value).toBe('a');
    t.advance(500);
    expect(t.player.state.value).toBe('b');
    expect(t.player.state.count).toBe(1);
  });

  it('cancels what the first run had scheduled, so frames never run twice', () => {
    const t = setup();
    t.advance(250);
    act(() => t.player.replay());
    expect(t.clock.pending()).toBe(1);
    // The old run's frame 2 was due 50 ms after the replay. It was cancelled, so after 250 ms
    // the new run has only reached its own frame 1.
    t.advance(250);
    expect(t.player.state.value).toBe('a');
    t.advance(50); // 300 ms into the new run: now its frame 2
    expect(t.player.state.value).toBe('b');
  });

  it('uses the step start state, not the end of the run before', () => {
    const t = setup();
    act(() => t.player.goTo(1));
    t.advance(200);
    expect(t.player.state.value).toBe('second-end');
    act(() => t.player.replay());
    expect(t.player.state.value).toBe('second-start');
    expect(t.player.state.count).toBe(10);
  });

  it('gives a replayed packet a fresh key, so its element mounts again', () => {
    const t = setup();
    t.advance(300);
    const before = t.player.activePackets[0]!.key;
    act(() => t.player.replay());
    t.advance(300);
    expect(t.player.activePackets[0]!.key).not.toBe(before);
  });

  it('plays again from a paused state, unpaused', () => {
    const t = setup();
    t.advance(150);
    act(() => t.player.togglePause());
    act(() => t.player.replay());
    expect(t.player.isPaused).toBe(false);
    t.advance(100);
    expect(t.player.state.value).toBe('a');
  });
});

describe('moving between steps', () => {
  it('next and back change the step and begin at its start state', () => {
    const t = setup();
    act(() => t.player.next());
    expect(t.player.stepIndex).toBe(1);
    expect(t.player.step.id).toBe('second');
    expect(t.player.state.value).toBe('second-start');
    act(() => t.player.back());
    expect(t.player.stepIndex).toBe(0);
    expect(t.player.state).toEqual(t.lesson.baseState);
  });

  it('stops at both ends instead of wrapping', () => {
    const t = setup();
    act(() => t.player.back());
    expect(t.player.stepIndex).toBe(0);
    act(() => t.player.goTo(2));
    act(() => t.player.next());
    expect(t.player.stepIndex).toBe(2);
  });

  it('goTo jumps straight to any step, forward or back', () => {
    const t = setup();
    act(() => t.player.goTo(2));
    expect(t.player.step.id).toBe('third');
    act(() => t.player.goTo(0));
    expect(t.player.step.id).toBe('first');
    act(() => t.player.goTo(1));
    expect(t.player.step.id).toBe('second');
  });

  it('clamps an index outside the lesson and ignores one that is not a number', () => {
    const t = setup();
    act(() => t.player.goTo(99));
    expect(t.player.stepIndex).toBe(2);
    act(() => t.player.goTo(-5));
    expect(t.player.stepIndex).toBe(0);
    act(() => t.player.goTo(1));
    act(() => t.player.goTo(Number.NaN));
    act(() => t.player.goTo(Number.POSITIVE_INFINITY));
    expect(t.player.stepIndex).toBe(1);
    act(() => t.player.goTo(1.9));
    expect(t.player.stepIndex).toBe(1);
  });

  it('goTo the step already showing starts it over', () => {
    const t = setup();
    t.advance(400);
    act(() => t.player.goTo(0));
    expect(t.player.state).toEqual(t.lesson.baseState);
  });

  it('cancels the timers and packets of the step it leaves', () => {
    const t = setup();
    t.advance(350); // a packet is in flight and two frames are still to come
    expect(t.player.activePackets).toHaveLength(1);
    act(() => t.player.goTo(1));
    expect(t.player.activePackets).toEqual([]);
    expect(t.clock.pending()).toBe(1); // only the new step's next frame
    t.advance(60_000);
    // The old step's frame at 600 (count: 1) never ran. This is the second step's end state.
    expect(t.player.state).toEqual({ ...t.lesson.baseState, value: 'second-end', count: 10 });
  });

  it('going back and replaying restarts from baseState, not from where the step ended', () => {
    const t = setup();
    t.advance(60_000);
    act(() => t.player.next());
    t.advance(60_000);
    act(() => t.player.back());
    expect(t.player.state).toEqual(t.lesson.baseState);
    t.advance(100);
    expect(t.player.state).toEqual({ ...t.lesson.baseState, value: 'a' });
  });

  it('ignores a timer that fires after the step changed but before React has cleaned up', () => {
    // Both happen in one batch: the step change is queued, then the old run's frame 1 fires.
    // That frame carries the old run, so it must not patch the step that replaced it.
    const t = setup();
    act(() => {
      t.player.goTo(1);
      t.clock.advance(100);
    });
    expect(t.player.step.id).toBe('second');
    expect(t.player.state.value).toBe('second-start');
    t.advance(200);
    expect(t.player.state.value).toBe('second-end');
  });
});

describe('reduced motion', () => {
  it('applies every frame at once on entry, with no packets and no timers', () => {
    const t = setup({ reducedMotion: true });
    expect(t.player.state).toEqual({
      value: 'b',
      count: 1,
      items: ['x', 'y'],
      nested: { a: 1, b: 1 },
    });
    expect(t.player.activePackets).toEqual([]);
    expect(t.player.reducedMotion).toBe(true);
    expect(t.clock.pending()).toBe(0);
  });

  it('shows the final state on every step it moves to, including startState', () => {
    const t = setup({ reducedMotion: true });
    act(() => t.player.next());
    expect(t.player.state).toEqual({ ...t.lesson.baseState, value: 'second-end', count: 10 });
    act(() => t.player.goTo(2));
    expect(t.player.state.nested).toEqual({ a: 2, b: 0 });
    expect(t.player.state.value).toBe('third-0');
    expect(t.clock.pending()).toBe(0);
  });

  it('replays to the same final state, and pause has nothing to pause', () => {
    const t = setup({ reducedMotion: true });
    act(() => t.player.replay());
    act(() => t.player.togglePause());
    expect(t.player.isPaused).toBe(false);
    expect(t.player.state.value).toBe('b');
  });

  it('switches mid-lesson when the setting changes, without leaving the step', () => {
    const t = setup();
    act(() => t.player.goTo(1));
    t.advance(50);
    t.rerender({ options: { reducedMotion: true } });
    expect(t.player.stepIndex).toBe(1);
    expect(t.player.state.value).toBe('second-end');
    expect(t.clock.pending()).toBe(0);
    t.rerender({ options: { reducedMotion: false } });
    expect(t.player.stepIndex).toBe(1);
    expect(t.player.state.value).toBe('second-start');
    t.advance(200);
    expect(t.player.state.value).toBe('second-end');
  });

  it('follows the visitor setting when no override is given', () => {
    const listeners = new Set<() => void>();
    let reduce = true;
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduce;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    try {
      const clock = createManualClock();
      const lesson = createTestLesson();
      const hook = renderHook(() => useLessonPlayer(lesson, testScene, { clock }));
      expect(hook.result.current.reducedMotion).toBe(true);
      expect(hook.result.current.state.value).toBe('b');
      act(() => {
        reduce = false;
        listeners.forEach((fn) => fn());
      });
      expect(hook.result.current.reducedMotion).toBe(false);
      expect(hook.result.current.state.value).toBe('base');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('the injectable clock', () => {
  it('is the only source of time: nothing runs until the clock moves', () => {
    vi.useFakeTimers();
    const t = setup(); // manual clock
    vi.advanceTimersByTime(60_000); // real (fake) timers are not the player's clock
    expect(t.player.state.value).toBe('base');
    t.advance(100);
    expect(t.player.state.value).toBe('a');
  });

  it('defaults to the browser timers, which test tools can fake', () => {
    vi.useFakeTimers();
    const lesson = createTestLesson();
    const hook = renderHook(() => useLessonPlayer(lesson, testScene, { reducedMotion: false }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.result.current.state.value).toBe('b');
    act(() => hook.result.current.togglePause());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(hook.result.current.state.value).toBe('b');
    act(() => hook.result.current.togglePause());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.result.current.state.count).toBe(1);
  });
});

describe('keyboard', () => {
  it('right and left arrows change the step', () => {
    const t = setup();
    press('ArrowRight');
    expect(t.player.stepIndex).toBe(1);
    press('ArrowRight');
    press('ArrowRight');
    expect(t.player.stepIndex).toBe(2);
    press('ArrowLeft');
    expect(t.player.stepIndex).toBe(1);
  });

  it('calls onPastEnd for the right arrow on the last step, and only there', () => {
    const onPastEnd = vi.fn();
    const t = setup({ onPastEnd });
    press('ArrowRight');
    press('ArrowRight');
    expect(t.player.stepIndex).toBe(2);
    expect(onPastEnd).not.toHaveBeenCalled(); // moving onto the last step is not past it
    press('ArrowRight');
    expect(onPastEnd).toHaveBeenCalledTimes(1);
    expect(t.player.stepIndex).toBe(2); // the hook itself stays where it is
    press('ArrowLeft');
    press('r');
    press(' ');
    expect(onPastEnd).toHaveBeenCalledTimes(1);
    expect(t.player.stepIndex).toBe(1);
  });

  it('does not call onPastEnd for the next() function, a held key or a modifier', () => {
    const onPastEnd = vi.fn();
    const t = setup({ onPastEnd });
    act(() => t.player.goTo(2));
    act(() => t.player.next());
    press('ArrowRight', { repeat: true });
    press('ArrowRight', { metaKey: true });
    expect(onPastEnd).not.toHaveBeenCalled();
  });

  it('does nothing on the last step when no onPastEnd is given', () => {
    const t = setup();
    act(() => t.player.goTo(2));
    press('ArrowRight');
    expect(t.player.stepIndex).toBe(2);
  });

  it('R replays, from the step start, in either case', () => {
    const t = setup();
    t.advance(400);
    press('r');
    expect(t.player.state).toEqual(t.lesson.baseState);
    t.advance(400);
    press('R');
    expect(t.player.state).toEqual(t.lesson.baseState);
  });

  it('Space pauses and resumes, and stops the page from scrolling', () => {
    const t = setup();
    t.advance(150);
    const event = press(' ');
    expect(event.defaultPrevented).toBe(true);
    expect(t.player.isPaused).toBe(true);
    t.advance(5000);
    expect(t.player.state.value).toBe('a');
    press(' ');
    expect(t.player.isPaused).toBe(false);
    t.advance(150);
    expect(t.player.state.value).toBe('b');
  });

  it('leaves Space to a focused button or link', () => {
    const t = setup();
    const button = document.body.appendChild(document.createElement('button'));
    const event = press(' ', {}, button);
    expect(event.defaultPrevented).toBe(false);
    expect(t.player.isPaused).toBe(false);
    // The arrows and R still work from a button.
    press('ArrowRight', {}, button);
    expect(t.player.stepIndex).toBe(1);
    button.remove();
  });

  it('ignores keys typed into a field and keys with modifiers', () => {
    const t = setup();
    const input = document.body.appendChild(document.createElement('input'));
    press('ArrowRight', {}, input);
    press(' ', {}, input);
    press('ArrowRight', { metaKey: true });
    press('r', { ctrlKey: true });
    expect(t.player.stepIndex).toBe(0);
    expect(t.player.isPaused).toBe(false);
    input.remove();
  });

  it('can be turned off', () => {
    const t = setup({ keyboard: false });
    press('ArrowRight');
    press(' ');
    expect(t.player.stepIndex).toBe(0);
    expect(t.player.isPaused).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    try {
      const t = setup();
      t.hook.unmount();
      const added = add.mock.calls.filter(([type]) => type === 'keydown').map(([, fn]) => fn);
      const removed = remove.mock.calls.filter(([type]) => type === 'keydown').map(([, fn]) => fn);
      expect(added.length).toBeGreaterThan(0);
      for (const handler of added) expect(removed).toContain(handler);
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  });

  it('does not handle a key another handler has already taken', () => {
    const t = setup();
    const taken = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener('keydown', taken, { capture: true });
    press('ArrowRight');
    document.removeEventListener('keydown', taken, { capture: true });
    expect(t.player.stepIndex).toBe(0);
  });
});

describe('lesson data and lesson changes', () => {
  it('plays a deeply frozen lesson, so the engine never changes lesson data', () => {
    const deepFreeze = <T,>(value: T): T => {
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
      }
      return value;
    };
    const lesson = deepFreeze(createTestLesson());
    const t = setup({}, lesson);
    t.advance(60_000);
    act(() => t.player.next());
    t.advance(60_000);
    act(() => t.player.replay());
    t.advance(60_000);
    expect(t.player.state.value).toBe('second-end');
    expect(lesson.baseState).toEqual({
      value: 'base',
      count: 0,
      items: [],
      nested: { a: 1, b: 1 },
    });
  });

  it('starts a different lesson at its first step, even from a later step of the old one', () => {
    const t = setup();
    act(() => t.player.goTo(2));
    const other = createTestLesson();
    other.slug = 'other';
    other.steps = [other.steps[1]!];
    t.rerender({ lesson: other });
    expect(t.player.stepIndex).toBe(0);
    expect(t.player.stepCount).toBe(1);
    expect(t.player.step.id).toBe('second');
    expect(t.player.state.value).toBe('second-start');
    t.advance(200);
    expect(t.player.state.value).toBe('second-end');
  });

  it('plays a lesson with another state shape: the engine is not tied to any lesson', () => {
    interface Other {
      title: string;
      done: boolean;
    }
    const scene: SceneDefinition<Other> = {
      viewBox: '0 0 10 10',
      lanes: {},
      Component: () => null,
      metrics: (s) => [{ value: s.title }, { value: String(s.done) }, { value: '' }],
    };
    const first = createTestLesson().steps[0]!;
    const step: Step<Other> = {
      ...first,
      startState: undefined,
      frames: [{ at: 50, set: { done: true } }],
    };
    const lesson: Lesson<Other> = {
      ...createTestLesson(),
      baseState: { title: 'T', done: false },
      steps: [step],
    };
    const clock = createManualClock();
    const hook = renderHook(() => useLessonPlayer(lesson, scene, { clock, reducedMotion: false }));
    expect(hook.result.current.metrics[1]).toEqual({ value: 'false' });
    act(() => clock.advance(50));
    expect(hook.result.current.metrics[1]).toEqual({ value: 'true' });
  });

  it('throws a clear error for a lesson with no steps', () => {
    const lesson = { ...createTestLesson(), steps: [] };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLessonPlayer(lesson, testScene))).toThrow(/no step 0/);
    spy.mockRestore();
  });
});

describe('React StrictMode', () => {
  it('plays the same: effects that mount twice do not double any frame or timer', () => {
    const clock = createManualClock();
    const lesson = createTestLesson();
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const hook = renderHook(
      () => useLessonPlayer(lesson, testScene, { clock, reducedMotion: false }),
      {
        wrapper,
      },
    );
    expect(clock.pending()).toBe(1);
    act(() => clock.advance(300));
    expect(hook.result.current.state.value).toBe('b');
    expect(hook.result.current.activePackets).toHaveLength(1);
    act(() => clock.advance(60_000));
    expect(hook.result.current.activePackets).toEqual([]);
    expect(hook.result.current.state.count).toBe(1);
  });
});
