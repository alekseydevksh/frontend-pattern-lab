import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { realClock, type Clock } from './clock';
import { commandForKey } from './keyboard';
import { PACKET_DURATION_MS } from './packets';
import { usePrefersReducedMotion } from './reducedMotion';
import { finalStateOf, patchState, startStateOf, stepAt } from './state';
import { createTimeline, type Timeline, type TimelineEvent } from './timeline';
import type { ActivePacket, Lesson, Metric, Packet, SceneDefinition, Step } from './types';

export interface PlayerOptions {
  /** The source of time. Tests pass a manual clock; the app uses the browser's timers. */
  clock?: Clock;
  /** Overrides the visitor's `prefers-reduced-motion` setting. Mainly for tests. */
  reducedMotion?: boolean;
  /** Listen for the arrow keys, R and Space on the document. Default true. */
  keyboard?: boolean;
  /**
   * Called when the right arrow is pressed on the last step, where `next` does nothing. The
   * page decides what that means: open the next lesson, or nothing at all. It is not called
   * for the Next button, which the page already owns.
   */
  onPastEnd?: () => void;
}

export interface LessonPlayer<S> {
  stepIndex: number;
  stepCount: number;
  step: Step<S>;
  /** The scene state right now: the start state of the step, with the frames that have run. */
  state: S;
  /** The scene's three metrics for `state`. */
  metrics: [Metric, Metric, Metric];
  /** Packets in flight, with their lanes resolved. Empty under reduced motion. */
  activePackets: ActivePacket[];
  isPaused: boolean;
  reducedMotion: boolean;
  /** Starts step `index` over. An index outside the lesson is clamped; a non-number is ignored. */
  goTo(index: number): void;
  /** Does nothing on the last step. */
  next(): void;
  /** Does nothing on the first step. */
  back(): void;
  /** Starts the current step over from its start state. Also resumes a paused step. */
  replay(): void;
  togglePause(): void;
}

/* ---------- state ---------- */

interface PlayerState<S> {
  lesson: Lesson<S>;
  /** The motion setting this run was started with. */
  reduced: boolean;
  stepIndex: number;
  scene: S;
  packets: Array<{ index: number; packet: Packet }>;
  isPaused: boolean;
  /** Changes every time a step is entered or replayed. Late timer callbacks carry the old one. */
  runId: number;
}

/**
 * Entering a step sets its state at once, in the same render that shows the step, so the
 * first paint is the complete start state. Under reduced motion it is the final state.
 */
function enterStep<S>(
  lesson: Lesson<S>,
  stepIndex: number,
  reduced: boolean,
  runId: number,
): PlayerState<S> {
  const step = stepAt(lesson, stepIndex);
  return {
    lesson,
    reduced,
    stepIndex,
    scene: reduced ? finalStateOf(lesson, step) : startStateOf(lesson, step),
    packets: [],
    isPaused: false,
    runId,
  };
}

type Action<S> =
  | { type: 'enter'; lesson: Lesson<S>; reduced: boolean; to: number | 'current' }
  | { type: 'move'; lesson: Lesson<S>; reduced: boolean; delta: 1 | -1 }
  | { type: 'frame'; runId: number; index: number; set?: Partial<S>; packet?: Packet }
  | { type: 'expire'; runId: number; index: number }
  | { type: 'togglePause' };

function reducer<S>(state: PlayerState<S>, action: Action<S>): PlayerState<S> {
  switch (action.type) {
    case 'enter': {
      const last = action.lesson.steps.length - 1;
      const to = action.to === 'current' ? state.stepIndex : action.to;
      const stepIndex = Math.min(Math.max(to, 0), last);
      return enterStep(action.lesson, stepIndex, action.reduced, state.runId + 1);
    }
    case 'move': {
      const stepIndex = state.stepIndex + action.delta;
      if (stepIndex < 0 || stepIndex >= action.lesson.steps.length) return state;
      return enterStep(action.lesson, stepIndex, action.reduced, state.runId + 1);
    }
    case 'frame': {
      if (action.runId !== state.runId) return state; // a timer from a step we have left
      const packets = action.packet
        ? [
            ...state.packets.filter((p) => p.index !== action.index),
            { index: action.index, packet: action.packet },
          ]
        : state.packets;
      return { ...state, scene: patchState(state.scene, action.set), packets };
    }
    case 'expire': {
      if (action.runId !== state.runId) return state;
      return { ...state, packets: state.packets.filter((p) => p.index !== action.index) };
    }
    case 'togglePause':
      // Nothing is scheduled under reduced motion, so there is nothing to pause.
      return state.reduced ? state : { ...state, isPaused: !state.isPaused };
  }
}

/* ---------- the hook ---------- */

/**
 * Plays a lesson: the current step, the scene state over time, and the packets in flight.
 *
 * Entering a step starts a timeline of its frames (and of the moments its packets are gone),
 * driven by `options.clock`. Pausing stores the elapsed time; resuming runs only what has
 * not run yet. See "Playback rules" in docs/SPEC.md and docs/ARCHITECTURE.md.
 *
 * The hook knows nothing about any one lesson. Everything it plays comes from `lesson`, and
 * `scene` is used only for the lane geometry and the metrics.
 */
export function useLessonPlayer<S>(
  lesson: Lesson<S>,
  scene: SceneDefinition<S>,
  options: PlayerOptions = {},
): LessonPlayer<S> {
  const { clock = realClock, keyboard = true, onPastEnd } = options;
  const preferred = usePrefersReducedMotion();
  const reducedMotion = options.reducedMotion ?? preferred;

  const [player, dispatch] = useReducer(reducer<S>, undefined, () =>
    enterStep(lesson, 0, reducedMotion, 0),
  );

  // A different lesson, or a change of the motion setting, starts the step over. The state
  // is replaced during render, so no frame is ever drawn with a stale step or setting.
  let current = player;
  if (player.lesson !== lesson || player.reduced !== reducedMotion) {
    const restart: Action<S> = {
      type: 'enter',
      lesson,
      reduced: reducedMotion,
      to: player.lesson === lesson ? 'current' : 0,
    };
    current = reducer(player, restart);
    dispatch(restart);
  }

  const { lesson: playing, stepIndex, runId, reduced, isPaused } = current;

  // Schedule the frames of the step that is showing. Cleanup drops whatever has not run.
  const timeline = useRef<Timeline | null>(null);
  useEffect(() => {
    if (reduced) return; // every frame was applied on entry
    const events: TimelineEvent[] = [];
    stepAt(playing, stepIndex).frames.forEach((frame, index) => {
      events.push({
        at: frame.at,
        run: () => dispatch({ type: 'frame', runId, index, set: frame.set, packet: frame.packet }),
      });
    });
    stepAt(playing, stepIndex).frames.forEach((frame, index) => {
      if (!frame.packet) return;
      events.push({
        at: frame.at + PACKET_DURATION_MS,
        run: () => dispatch({ type: 'expire', runId, index }),
      });
    });
    const running = createTimeline(events, clock);
    timeline.current = running;
    running.start();
    return () => {
      running.cancel();
      if (timeline.current === running) timeline.current = null;
    };
  }, [playing, stepIndex, runId, reduced, clock]);

  // Pause and resume follow the state. A new run always starts unpaused, so on a step change
  // this effect only ever finds a running timeline, for which resume does nothing.
  useEffect(() => {
    if (isPaused) timeline.current?.pause();
    else timeline.current?.resume();
  }, [isPaused, runId]);

  const goTo = useCallback(
    (index: number) => {
      if (!Number.isFinite(index)) return;
      dispatch({ type: 'enter', lesson, reduced: reducedMotion, to: Math.trunc(index) });
    },
    [lesson, reducedMotion],
  );
  const next = useCallback(
    () => dispatch({ type: 'move', lesson, reduced: reducedMotion, delta: 1 }),
    [lesson, reducedMotion],
  );
  const back = useCallback(
    () => dispatch({ type: 'move', lesson, reduced: reducedMotion, delta: -1 }),
    [lesson, reducedMotion],
  );
  const replay = useCallback(
    () => dispatch({ type: 'enter', lesson, reduced: reducedMotion, to: 'current' }),
    [lesson, reducedMotion],
  );
  const togglePause = useCallback(() => dispatch({ type: 'togglePause' }), []);

  const onLastStep = stepIndex === playing.steps.length - 1;
  useEffect(() => {
    if (!keyboard) return;
    const commands = { next, back, replay, togglePause };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const command = commandForKey(event);
      if (!command) return;
      // Space would scroll the page. The arrows and R have no default that we need to stop.
      if (command === 'togglePause') event.preventDefault();
      if (command === 'next' && onLastStep) onPastEnd?.();
      else commands[command]();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [keyboard, next, back, replay, togglePause, onLastStep, onPastEnd]);

  const lanes = scene.lanes;
  const activePackets = useMemo(
    () =>
      current.packets.flatMap(({ index, packet }) => {
        const lane = lanes[packet.lane];
        return lane ? [{ key: `${runId}:${index}`, packet, lane }] : [];
      }),
    [current.packets, lanes, runId],
  );
  const metrics = useMemo(() => scene.metrics(current.scene), [scene, current.scene]);

  return {
    stepIndex,
    stepCount: playing.steps.length,
    step: stepAt(playing, stepIndex),
    state: current.scene,
    metrics,
    activePackets,
    isPaused,
    reducedMotion: reduced,
    goTo,
    next,
    back,
    replay,
    togglePause,
  };
}
