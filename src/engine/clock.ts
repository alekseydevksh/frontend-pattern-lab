/**
 * The engine's only source of time. The player takes a Clock, so tests drive it by hand
 * and never wait. In the app it is the browser's own timers.
 */
export interface Clock {
  /** Milliseconds on a monotonic scale. Only differences matter. */
  now(): number;
  /** Runs `callback` once after `ms`. Returns a handle for `clearTimeout`. */
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

// Each method looks the global up at call time, so test tools that replace the global
// timers after this module loads (for example vi.useFakeTimers) still take effect.
export const realClock: Clock = {
  now: () => performance.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};
