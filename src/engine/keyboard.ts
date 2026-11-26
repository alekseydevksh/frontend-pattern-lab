/** What a key press asks the player to do. */
export type PlayerCommand = 'next' | 'back' | 'replay' | 'togglePause';

/** The parts of a KeyboardEvent that matter here, so tests do not need a real event. */
export interface KeyPress {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** True for the repeats a held key sends. */
  repeat?: boolean;
  target?: EventTarget | null;
}

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const ACTIVATABLE = 'button, a[href], summary, [role="button"], [role="link"]';

function matches(target: EventTarget | null | undefined, selector: string): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

/**
 * Maps a key press to a player command, or null when the page should keep the key.
 *
 * - Left and right arrows change step, `R` replays, Space pauses and resumes.
 * - Space does nothing when focus is on a button or a link, where it already means "activate".
 * - Nothing fires while typing in a field, with Ctrl, Meta or Alt held (browser and
 *   assistive-technology shortcuts), or for the repeats of a held key.
 */
export function commandForKey(press: KeyPress): PlayerCommand | null {
  if (press.metaKey || press.ctrlKey || press.altKey || press.repeat) return null;
  if (matches(press.target, EDITABLE)) return null;
  switch (press.key) {
    case 'ArrowRight':
      return 'next';
    case 'ArrowLeft':
      return 'back';
    case 'r':
    case 'R':
      return 'replay';
    case ' ':
      return matches(press.target, ACTIVATABLE) ? null : 'togglePause';
    default:
      return null;
  }
}
