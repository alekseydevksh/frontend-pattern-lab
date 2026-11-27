'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 5, Rendering Isolation: the component tree of a small chat screen, drawn from
 * left to right. `App` holds `Header`, `Form` and `Thread`; `Form` holds `Input` and
 * `Send`; `Thread` holds `Messages`. Each box counts its renders and says, in a word as well as a
 * colour, what it did on the last change: rendered with something new to show, rendered for
 * nothing (wasted), or skipped by a memo boundary. A teal chip marks the component that owns the
 * state. Below the tree, a card shows the change and another the contexts and who reads them;
 * beside it, bracket notes explain a group of rows, as in lesson 3.
 *
 * Pure: the same state always draws the same SVG. A box's mark stays until the next change, so
 * reduced motion, which shows only the final state of a step, still shows what rendered. The tree's
 * shape is a constant of the drawing; every word on screen, the component names included, comes
 * from the state (`labels` and the fields the frames patch), which comes from the lesson data.
 */

/** One value per component, in the order of `NODES`. */
export type PerNode<T> = [T, T, T, T, T, T, T];

/** What a component did on the last change. `idle`: it did not render (or nothing changed yet). */
export type RenderMark = 'idle' | 'used' | 'wasted' | 'skipped';

export type NoteTone = 'req' | 'res' | 'bad' | 'muted';

/** A bracket beside the tree, from the top of row `from` to the bottom of row `to`. */
export interface BracketNote {
  from: number;
  to: number;
  title: string;
  note: string;
  tone: NoteTone;
}

/** A context and the components that read it. */
export interface ContextBox {
  name: string;
  /** The values it holds, as written in the card. */
  keys: string;
  /** The names of its readers, as written in the card. */
  readers: string;
}

export interface IsolationLabels {
  /** The note that the tree and the costs are made up. */
  illustrative: string;
  tree: string;
  /** The component names, in the order of `NODES`. */
  nodes: PerNode<string>;
  /** Template: `{n}`. */
  count: string;
  used: string;
  wasted: string;
  skipped: string;
  /** The chip on the component that owns the state. Template: `{name}`. */
  owns: string;
  change: string;
  noChange: string;
  context: string;
  /** Template: `{names}`. */
  readBy: string;
  memo: string;
  contain: string;
  /** The "components rendered" metric. Template: `{n}`, `{total}`. */
  renderedOf: string;
  none: string;
}

export interface IsolationState {
  labels: IsolationLabels;
  /** How many times each component has rendered in this step. */
  renders: PerNode<number>;
  /** What each component did on the last change. */
  marks: PerNode<RenderMark>;
  /** The component that owns the state that changes; `null` when a context holds it. */
  owner: number | null;
  /** The name of that state, written on the owner's chip. */
  stateName: string;
  /** The last change, or `null` before the first. */
  change: { text: string; tone: 'req' | 'ev' } | null;
  /** The contexts in use; none when empty. */
  contexts: ContextBox[];
  /** Which of `contexts` holds the state that changes. */
  contextHome: number | null;
  /** The memo boundary around the thread: none, one that props defeat, or one that skips. */
  memo: 'off' | 'leaky' | 'stable';
  /** Whether the message list is a contained section. */
  contained: boolean;
  notes: BracketNote[];
}

/** Where each component sits: its column (depth) and row, and its parent. */
const NODES = [
  { col: 0, row: 1, parent: null },
  { col: 1, row: 0, parent: 0 },
  { col: 1, row: 1, parent: 0 },
  { col: 2, row: 1, parent: 2 },
  { col: 2, row: 2, parent: 2 },
  { col: 1, row: 3, parent: 0 },
  { col: 2, row: 3, parent: 5 },
] as const;
const THREAD = 5;

const COL_X = [32, 172, 342] as const;
const COL_W = [80, 110, 110] as const;
const BOX_H = 42;
const rowTop = (row: number) => 73 + row * 60;
const rowMid = (row: number) => rowTop(row) + BOX_H / 2;
const SPINE = 142;
const FORK = 312;
const BRACKET = 468;
const BOTTOM = { y: 320, h: 80, inner: 352 } as const;

const cap = 'font-mono text-label tracking-caps-wide';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const small = 'font-mono text-micro fill-muted-text';
const note = 'font-body text-micro fill-muted-text';
const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';
const edge = 'fill-none stroke-line stroke-[1.5]';
/** The advance of one character of IBM Plex Mono at the micro size, to size chips to their text. */
const MICRO_CHAR = 6.3;

const toneStroke = {
  req: 'stroke-req',
  res: 'stroke-res',
  bad: 'stroke-bad',
  muted: 'stroke-muted',
} as const;
const toneText = {
  req: 'fill-req-text',
  res: 'fill-res-text',
  bad: 'fill-bad-text',
  muted: 'fill-muted-text',
} as const;

const rendered = (m: RenderMark) => m === 'used' || m === 'wasted';

/** How many components rendered on the last change. */
export function renderedCount(s: IsolationState): number {
  return s.marks.filter(rendered).length;
}

/** How many of them rendered for nothing: their output did not change. */
export function wastedCount(s: IsolationState): number {
  return s.marks.filter((m) => m === 'wasted').length;
}

/** The name of the place the changing state lives: a component or a context. */
export function stateHome(s: IsolationState): string | null {
  if (s.owner !== null) return s.labels.nodes[s.owner] ?? null;
  if (s.contextHome !== null) return s.contexts[s.contextHome]?.name ?? null;
  return null;
}

/**
 * A small chip resting on the top edge of a box: the state a component or a context owns. `x` is
 * its left end, or its right end when `alignRight`.
 */
function StateChip(props: { x: number; top: number; text: string; alignRight?: boolean }) {
  const { top, text } = props;
  const w = text.length * MICRO_CHAR + 14;
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
function BoundaryLabel({
  x,
  y,
  text,
  tone,
}: {
  x: number;
  y: number;
  text: string;
  tone: NoteTone;
}) {
  const w = text.length * MICRO_CHAR + 12;
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

function Node({ s, i }: { s: IsolationState; i: number }) {
  const { labels } = s;
  const { col, row } = NODES[i]!;
  const x = COL_X[col]!;
  const w = COL_W[col]!;
  const y = rowTop(row);
  const mark = s.marks[i] ?? 'idle';
  const count = s.renders[i] ?? 0;
  const word = { idle: null, used: labels.used, wasted: labels.wasted, skipped: labels.skipped }[
    mark
  ];
  return (
    <g data-mark={mark}>
      <rect
        x={x}
        y={y}
        width={w}
        height={BOX_H}
        rx={8}
        strokeDasharray={mark === 'skipped' ? '4 3' : undefined}
        className={cx(
          ease,
          'fill-paper',
          mark === 'used' && 'stroke-req stroke-2',
          mark === 'wasted' && 'stroke-bad stroke-2',
          mark === 'skipped' && 'stroke-muted stroke-[1.5]',
          mark === 'idle' && 'stroke-line stroke-[1.5]',
        )}
      />
      <text x={x + 10} y={y + 17} className="font-mono text-[12px] font-semibold fill-ink">
        {labels.nodes[i]}
      </text>
      <text
        x={x + w - 9}
        y={y + 17}
        textAnchor="end"
        className={cx(
          ease,
          'font-mono text-label font-semibold',
          count > 0 ? 'fill-ink' : 'fill-muted-text',
        )}
      >
        {format(labels.count, { n: count })}
      </text>
      {word !== null && (
        <text
          x={x + 10}
          y={y + 33}
          className={cx(
            'font-mono text-micro font-semibold tracking-caps',
            mark === 'used' && 'fill-req-text',
            mark === 'wasted' && 'fill-bad-text',
            mark === 'skipped' && 'fill-muted-text',
          )}
        >
          {word}
        </text>
      )}
      {s.owner === i && (
        <StateChip x={x + 8} top={y} text={format(labels.owns, { name: s.stateName })} />
      )}
    </g>
  );
}

/** A bracket beside the tree, with a title and a note, as in lesson 3. */
function Bracket({ n }: { n: BracketNote }) {
  const y1 = rowTop(n.from);
  const y2 = rowTop(n.to) + BOX_H;
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={BRACKET}
        y1={y1}
        x2={BRACKET}
        y2={y2}
        strokeWidth={2}
        className={toneStroke[n.tone]}
      />
      <text x={BRACKET + 8} y={mid - 2} className={cx(cap, toneText[n.tone])}>
        {n.title}
      </text>
      <text x={BRACKET + 8} y={mid + 13} className={small}>
        {n.note}
      </text>
    </g>
  );
}

function IsolationDrawing({ state: s }: { state: IsolationState }) {
  const { labels } = s;
  const contextShown = s.contexts.length > 0;
  const ctxX = 216;
  const ctxW = 408;
  const boxGap = 12;
  const boxW =
    s.contexts.length > 0 ? (ctxW - 32 - boxGap * (s.contexts.length - 1)) / s.contexts.length : 0;

  // The memo boundary around Thread and Messages, and the contain boundary around Messages.
  const threadTop = rowTop(NODES[THREAD].row);
  const memoTone: NoteTone = s.memo === 'leaky' ? 'bad' : 'res';

  return (
    <g>
      <text className={small} x={624} y={16} textAnchor="end">
        {labels.illustrative}
      </text>

      <rect className={panel} x={16} y={28} width={608} height={280} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={52}>
        {labels.tree}
      </text>

      {/* The edges of the tree. The packets travel along the middle row, from Input up to App. */}
      <path
        className={edge}
        d={`M${COL_X[0] + COL_W[0]} ${rowMid(1)}H${SPINE}M${SPINE} ${rowMid(0)}V${rowMid(3)}`}
      />
      {[0, 1, 3].map((row) => (
        <line
          key={row}
          className={edge}
          x1={SPINE}
          y1={rowMid(row)}
          x2={COL_X[1]}
          y2={rowMid(row)}
        />
      ))}
      <path
        className={edge}
        d={`M${COL_X[1] + COL_W[1]} ${rowMid(1)}H${COL_X[2]}M${FORK} ${rowMid(1)}V${rowMid(2)}H${COL_X[2]}M${COL_X[1] + COL_W[1]} ${rowMid(3)}H${COL_X[2]}`}
      />

      <g className={cx(ease, s.memo === 'off' && 'opacity-0')}>
        <rect
          x={COL_X[1] - 6}
          y={threadTop - 6}
          width={COL_X[2] + COL_W[2] - COL_X[1] + 12}
          height={BOX_H + 12}
          rx={12}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          className={cx(ease, 'fill-none', toneStroke[memoTone])}
        />
        <BoundaryLabel x={FORK - 22} y={threadTop - 6} text={labels.memo} tone={memoTone} />
      </g>

      {NODES.map((_, i) => (
        <Node key={i} s={s} i={i} />
      ))}

      <g className={cx(ease, !s.contained && 'opacity-0')}>
        <rect
          x={COL_X[2] - 5}
          y={threadTop - 5}
          width={COL_W[2] + 10}
          height={BOX_H + 10}
          rx={11}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          className="fill-none stroke-res"
        />
        <BoundaryLabel
          x={COL_X[2] + COL_W[2] - 60}
          y={threadTop - 5}
          text={labels.contain}
          tone="res"
        />
      </g>

      {s.notes.map((n, i) => (
        <Bracket key={i} n={n} />
      ))}

      {/* The change that started the last render. */}
      <rect className={panel} x={16} y={BOTTOM.y} width={184} height={BOTTOM.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={BOTTOM.y + 22}>
        {labels.change}
      </text>
      <rect
        x={28}
        y={BOTTOM.inner}
        width={160}
        height={38}
        rx={8}
        strokeWidth={1.5}
        strokeDasharray={s.change ? undefined : '4 3'}
        className={cx(
          ease,
          'fill-paper',
          s.change === null ? 'stroke-line' : s.change.tone === 'req' ? 'stroke-req' : 'stroke-ev',
        )}
      />
      {s.change ? (
        <text
          x={40}
          y={BOTTOM.inner + 23}
          className={cx(
            'font-mono text-[12px] font-semibold',
            s.change.tone === 'req' ? 'fill-req-text' : 'fill-ev-text',
          )}
        >
          {s.change.text}
        </text>
      ) : (
        <text x={108} y={BOTTOM.inner + 22} textAnchor="middle" className={note}>
          {labels.noChange}
        </text>
      )}

      {/* The contexts, and who reads each. */}
      <g className={cx(ease, !contextShown && 'opacity-0')}>
        <rect className={panel} x={ctxX} y={BOTTOM.y} width={ctxW} height={BOTTOM.h} rx={14} />
        <text className={cx(cap, 'fill-muted-text')} x={ctxX + 16} y={BOTTOM.y + 22}>
          {labels.context}
        </text>
        {s.contexts.map((c, i) => {
          const x = ctxX + 16 + i * (boxW + boxGap);
          const home = s.contextHome === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={BOTTOM.inner}
                width={boxW}
                height={38}
                rx={8}
                strokeWidth={1.5}
                className={cx(ease, 'fill-paper', home ? 'stroke-res' : 'stroke-line')}
              />
              <text
                x={x + 10}
                y={BOTTOM.inner + 17}
                className="font-mono text-label font-semibold fill-ink"
              >
                {c.name}
              </text>
              <text x={x + boxW - 10} y={BOTTOM.inner + 17} textAnchor="end" className={small}>
                {c.keys}
              </text>
              <text x={x + 10} y={BOTTOM.inner + 31} className={note}>
                {format(labels.readBy, { names: c.readers })}
              </text>
              {home && (
                <StateChip
                  x={x + boxW - 8}
                  top={BOTTOM.inner}
                  alignRight
                  text={format(labels.owns, { name: s.stateName })}
                />
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
}

function metrics(s: IsolationState): [Metric, Metric, Metric] {
  const { labels } = s;
  const n = renderedCount(s);
  const wasted = wastedCount(s);
  const home = stateHome(s);
  // Nothing has rendered since the last change: the counts say nothing yet.
  const tone: Metric['tone'] = n === 0 ? undefined : wasted > 0 ? 'bad' : 'good';
  const withTone = (value: string): Metric => (tone ? { value, tone } : { value });
  return [
    n === 0
      ? { value: labels.none }
      : withTone(format(labels.renderedOf, { n, total: NODES.length })),
    n === 0 ? { value: labels.none } : withTone(String(wasted)),
    home === null ? { value: labels.none } : withTone(home),
  ];
}

export const renderingIsolationScene: SceneDefinition<IsolationState> = {
  viewBox: '0 0 640 408',
  // A change in the field travels up the middle row: from Input to Form, then on to App.
  lanes: {
    toForm: { x1: COL_X[2], x2: COL_X[1] + COL_W[1], y: rowMid(1) },
    toApp: { x1: COL_X[1], x2: COL_X[0] + COL_W[0], y: rowMid(1) },
  },
  Component: IsolationDrawing,
  metrics,
};
