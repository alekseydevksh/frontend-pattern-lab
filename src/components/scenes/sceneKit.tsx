// No 'use client' here: this module has no hooks and no state. It is bundled with whichever scene
// imports it, and a scene starts with 'use client' (D16).

import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The building blocks the scenes of lessons 7 and later share: the text and panel styles, the
 * colour of each tone, the bracket beside a diagram, the small chips on a box, and the width of a
 * line of small mono text. A scene's own layout, and every word it draws, stay in the scene and in
 * its lesson's data.
 *
 * Lessons 3 to 6 keep their own copies of these. A lesson page loads one scene, so sharing code can
 * never make a page smaller, only larger: measured on lessons 3 to 6, a shared module costs 8 to
 * 55 bytes per page for the style strings, and about 0.45 KB per page for a component that two
 * lesson pages share (it lands in a chunk of its own). Moving those four scenes over would have
 * grown their pages, which D20 rules out; use this module where a new scene would otherwise
 * repeat these blocks, and measure the page with `pnpm budget`.
 *
 * Only scenes import this module, and it imports no scene: a lesson page that carries a scene then
 * carries these blocks and nothing of another lesson. `boundaries.test.ts` checks both, and
 * `pnpm budget` checks the built pages. Everything here is pure: the same props draw the same SVG.
 * Colours are token classes (`src/styles/tokens.css`), never a hard-coded colour.
 */

/** A caps label: monospace, tracked. Add a fill (`fill-muted-text`, a tone's text colour). */
export const cap = 'font-mono text-label tracking-caps-wide';
/** A panel: the raised surface boxes are drawn on. */
export const panel = 'fill-panel stroke-line stroke-[1.5]';
/** A box drawn on a panel, in the paper colour. */
export const inner = 'fill-paper stroke-line stroke-[1.5]';
/** Small monospace text in the muted colour. */
export const small = 'font-mono text-micro fill-muted-text';
/** Small body text in the muted colour. */
export const note = 'font-body text-micro fill-muted-text';
/** The transition every changing stroke, fill or opacity uses. */
export const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';

/** The colours a scene gives a thing by its meaning: see `src/styles/tokens.css`. */
export type ToneKey = 'req' | 'res' | 'ev' | 'bad' | 'muted';

export const toneStroke = {
  req: 'stroke-req',
  res: 'stroke-res',
  ev: 'stroke-ev',
  bad: 'stroke-bad',
  muted: 'stroke-muted',
} as const satisfies Record<ToneKey, string>;

export const toneText = {
  req: 'fill-req-text',
  res: 'fill-res-text',
  ev: 'fill-ev-text',
  bad: 'fill-bad-text',
  muted: 'fill-muted-text',
} as const satisfies Record<ToneKey, string>;

/** The advance of one character of IBM Plex Mono at the micro size, to size chips to their text. */
export const MICRO_CHAR = 6.3;

/** The width of a chip around `text` set in the micro mono size: its characters plus `padding`. */
export const microWidth = (text: string, padding: number) => text.length * MICRO_CHAR + padding;

/**
 * A bracket beside a diagram, from `y1` to `y2` at `x`, with a coloured title and a note in muted
 * text to its right.
 */
export function Bracket(props: {
  x: number;
  y1: number;
  y2: number;
  title: ReactNode;
  note: ReactNode;
  tone: ToneKey;
}) {
  const { x, y1, y2, tone } = props;
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} strokeWidth={2} className={toneStroke[tone]} />
      <text x={x + 8} y={mid - 2} className={cx(cap, toneText[tone])}>
        {props.title}
      </text>
      <text x={x + 8} y={mid + 13} className={small}>
        {props.note}
      </text>
    </g>
  );
}

/** A titled panel: the surface and its caps title in the top left corner. */
export function PanelBox(props: { x: number; y: number; w: number; h: number; title: string }) {
  return (
    <g>
      <rect className={panel} x={props.x} y={props.y} width={props.w} height={props.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={props.x + 16} y={props.y + 24}>
        {props.title}
      </text>
    </g>
  );
}

/**
 * A small chip resting on the top edge of a box: the state a component or a context owns. `x` is
 * its left end, or its right end when `alignRight`.
 */
export function StateChip(props: { x: number; top: number; text: string; alignRight?: boolean }) {
  const { top, text } = props;
  const w = microWidth(text, 14);
  const x = props.alignRight ? props.x - w : props.x;
  return (
    <g>
      <rect
        x={x}
        y={top - 13}
        width={w}
        height={14}
        rx={4}
        className="fill-panel stroke-res stroke-[1.5]"
      />
      <text x={x + 7} y={top - 2.5} className="font-mono text-micro font-semibold fill-res-text">
        {text}
      </text>
    </g>
  );
}

/** A label sitting on a dashed boundary, with a panel-coloured backing so the line stops at it. */
export function BoundaryLabel(props: { x: number; y: number; text: string; tone: ToneKey }) {
  const { x, y, text, tone } = props;
  const w = microWidth(text, 12);
  return (
    <g>
      <rect x={x} y={y - 7} width={w} height={14} rx={4} className="fill-panel" />
      <text
        x={x + 6}
        y={y + 3.5}
        className={cx('font-mono text-micro font-semibold', toneText[tone])}
      >
        {text}
      </text>
    </g>
  );
}
