'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 3, Virtualization: a browser with a long list, its viewport window, the rows
 * around it and the blocks that stand for the rest of the list, and a scrollbar; an API panel the
 * list fetches pages from over one lane; and a DOM panel that counts the rows mounted against the
 * total, with a chip for CSS containment and four chips for the costs of a window.
 *
 * Pure: the same state always draws the same SVG. It draws a simulation, never a real long list:
 * eight row slots and two blocks, whatever the counts say. Every word on screen comes from the
 * state (`labels` and the fields the frames patch), which comes from the lesson data.
 */

export interface VirtualizationLabels {
  /** Locale for the digit grouping of counts ("10,000"). */
  locale: string;
  browser: string;
  /** The note that the counts in the drawing are made up. */
  illustrative: string;
  api: string;
  endpoint: string;
  /** Templates: `{total}`, `{page}`; `{rows}`. */
  apiNote: string;
  sent: string;
  fetch: string;
  http: string;
  dom: string;
  mountedRows: string;
  /** Templates: `{total}`; `{n}`. */
  ofTotal: string;
  nodes: string;
  perRow: string;
  /** Template for a row: `{n}`. */
  row: string;
  viewport: string;
  inView: string;
  /** The rows next to the viewport: off-screen when everything is mounted, overscan in a window. */
  offscreen: string;
  offscreenMounted: string;
  offscreenSkipped: string;
  overscan: string;
  overscanNote: string;
  /** The blocks above and below the row slots. Templates: `{rows}`, `{px}`. */
  blockMounted: string;
  blockSkipped: string;
  spacer: string;
  noSpacer: string;
  blockRows: string;
  spacerSize: string;
  noSpacerNote: string;
  contain: string;
  containNote: string;
  /** The four costs of a window, in the order they light up. */
  costs: [string, string, string, string];
  none: string;
}

export interface VirtualizationState {
  labels: VirtualizationLabels;
  /** Rows the list has on the server. */
  total: number;
  /** Rows fetched so far. */
  loaded: number;
  /** Rows the API sends per page. */
  pageSize: number;
  /** The number of the row in the top slot. The viewport shows the 3rd to the 6th slot. */
  first: number;
  /** `all`: every fetched row is in the DOM. `window`: only the eight slots are. */
  mounted: 'all' | 'window';
  /** In a window: whether spacers stand in for the rows that are not mounted. */
  spacers: boolean;
  /** Whether off-screen rows skip layout and paint (`content-visibility: auto`). */
  contain: boolean;
  /** How many of the four cost chips are lit. */
  costs: number;
  /** The height of one row in pixels, and the DOM nodes in one row. */
  rowPx: number;
  nodesPerRow: number;
  /** Above this many nodes the DOM count is marked as a problem. */
  nodeBudget: number;
  /** The third metric, written by the lesson data. */
  cost: Metric;
}

const SLOTS = 8;
const VIEW = { from: 2, to: 5 } as const;
const slotY = (i: number) => 102 + i * 22;
const TRACK = { y: 60, h: 256 } as const;

const cap = 'font-mono text-label tracking-caps-wide';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const inner = 'fill-paper stroke-line stroke-[1.5]';
const small = 'font-mono text-micro fill-muted-text';
const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';

/** Rows in the DOM right now. */
export function mountedRows(s: VirtualizationState) {
  if (s.mounted === 'all') return s.loaded;
  return Math.max(0, Math.min(SLOTS, s.loaded - s.first + 1));
}

/** One of the two blocks that stand for the rows above or below the slots. */
function Block({ s, y, rows }: { s: VirtualizationState; y: number; rows: number }) {
  if (rows <= 0) return null;
  const { labels } = s;
  const n = rows.toLocaleString(labels.locale);
  const kind =
    s.mounted === 'all' ? (s.contain ? 'skipped' : 'mounted') : s.spacers ? 'spacer' : 'missing';
  const title = {
    mounted: labels.blockMounted,
    skipped: labels.blockSkipped,
    spacer: labels.spacer,
    missing: labels.noSpacer,
  }[kind];
  const detail =
    kind === 'spacer'
      ? format(labels.spacerSize, { rows: n, px: (rows * s.rowPx).toLocaleString(labels.locale) })
      : format(kind === 'missing' ? labels.noSpacerNote : labels.blockRows, { rows: n });
  return (
    <g>
      <rect
        x={40}
        y={y}
        width={174}
        height={36}
        rx={6}
        strokeWidth={1.5}
        strokeDasharray={kind === 'spacer' ? '4 3' : undefined}
        className={cx(
          ease,
          kind === 'mounted' && 'fill-panel stroke-bad',
          kind === 'skipped' && 'fill-panel stroke-line',
          kind === 'spacer' && 'fill-none stroke-muted',
          kind === 'missing' && 'fill-none stroke-none',
        )}
      />
      <text
        x={127}
        y={y + 15}
        textAnchor="middle"
        className={cx(
          cap,
          kind === 'mounted' || kind === 'missing' ? 'fill-bad-text' : 'fill-muted-text',
        )}
      >
        {title}
      </text>
      <text x={127} y={y + 29} textAnchor="middle" className="font-body text-micro fill-ink">
        {detail}
      </text>
    </g>
  );
}

/** A bracket in the gap beside the list, with a title and a note. */
function Note({ y1, y2, title, note, tone }: Record<'y1' | 'y2', number> & NoteText) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={258} y1={y1} x2={258} y2={y2} strokeWidth={2} className={toneStroke[tone]} />
      <text x={266} y={mid - 2} className={cx(cap, toneText[tone])}>
        {title}
      </text>
      <text x={266} y={mid + 13} className={small}>
        {note}
      </text>
    </g>
  );
}
type NoteText = { title: string; note: string; tone: 'req' | 'bad' | 'muted' };
const toneStroke = { req: 'stroke-req', bad: 'stroke-bad', muted: 'stroke-muted' } as const;
const toneText = { req: 'fill-req-text', bad: 'fill-bad-text', muted: 'fill-muted-text' } as const;

function VirtualizationDrawing({ state: s }: { state: VirtualizationState }) {
  const { labels } = s;
  const num = (n: number) => n.toLocaleString(labels.locale);
  const windowed = s.mounted === 'window';
  const inDom = mountedRows(s);
  const nodes = inDom * s.nodesPerRow;
  const last = s.first + SLOTS - 1;

  // The scrollbar. Without spacers a window is only eight rows tall, and the thumb says so.
  const content = windowed && !s.spacers ? Math.min(SLOTS, s.loaded) : s.loaded;
  const viewRows = VIEW.to - VIEW.from + 1;
  const thumbH = content <= viewRows ? TRACK.h : Math.max(12, (TRACK.h * viewRows) / content);
  const top = windowed && !s.spacers ? VIEW.from : s.first - 1 + VIEW.from;
  const thumbY = TRACK.y + (TRACK.h - thumbH) * Math.min(1, top / Math.max(1, content - viewRows));
  const lying = windowed && !s.spacers;

  const side: NoteText = windowed
    ? { title: labels.overscan, note: labels.overscanNote, tone: 'muted' }
    : s.contain
      ? { title: labels.offscreen, note: labels.offscreenSkipped, tone: 'muted' }
      : { title: labels.offscreen, note: labels.offscreenMounted, tone: 'bad' };

  return (
    <g>
      <rect className={panel} x={16} y={16} width={236} height={320} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={40}>
        {labels.browser}
      </text>
      <text className={small} x={236} y={40} textAnchor="end">
        {labels.illustrative}
      </text>
      <rect className={inner} x={32} y={52} width={204} height={272} rx={10} />

      <Block s={s} y={60} rows={Math.min(s.first - 1, s.loaded)} />
      <Block s={s} y={280} rows={s.loaded - last} />

      {Array.from({ length: SLOTS }, (_, i) => {
        const n = s.first + i;
        if (n > s.loaded) return null;
        const inView = i >= VIEW.from && i <= VIEW.to;
        const skipped = !inView && !windowed && s.contain;
        return (
          <g key={i}>
            <rect
              x={40}
              y={slotY(i)}
              width={174}
              height={18}
              rx={4}
              strokeWidth={1.5}
              strokeDasharray={!inView && windowed ? '3 3' : undefined}
              className={cx(
                ease,
                'fill-panel',
                inView || skipped ? 'stroke-line' : windowed ? 'stroke-muted' : 'stroke-bad',
              )}
            />
            <text
              x={50}
              y={slotY(i) + 13}
              className={cx('font-mono text-label', skipped ? 'fill-muted-text' : 'fill-ink')}
            >
              {format(labels.row, { n: num(n) })}
            </text>
          </g>
        );
      })}

      <rect x={222} y={TRACK.y} width={6} height={TRACK.h} rx={3} className="fill-line" />
      {s.loaded > 0 && (
        <rect
          x={222}
          y={0}
          width={6}
          height={thumbH}
          rx={3}
          style={{ transform: `translateY(${thumbY}px)` }}
          className={cx(
            'transition-[transform,fill] duration-500',
            lying ? 'fill-bad' : 'fill-muted',
          )}
        />
      )}

      {s.loaded > 0 && (
        <>
          <rect
            className="fill-none stroke-req stroke-2"
            x={36}
            y={143}
            width={182}
            height={90}
            rx={6}
          />
          <Note y1={142} y2={234} title={labels.viewport} note={labels.inView} tone="req" />
          <Note y1={102} y2={140} {...side} />
          <Note y1={236} y2={274} {...side} />
        </>
      )}

      <line
        className="stroke-line stroke-2 [stroke-dasharray:3_5]"
        x1={252}
        y1={70}
        x2={388}
        y2={70}
      />
      <text className={cx(cap, 'fill-muted-text')} x={320} y={52} textAnchor="middle">
        {labels.fetch}
      </text>
      <text className={cx(cap, 'fill-muted-text')} x={320} y={94} textAnchor="middle">
        {labels.http}
      </text>

      <rect className={panel} x={388} y={16} width={236} height={112} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={404} y={40}>
        {labels.api}
      </text>
      <rect className={inner} x={404} y={52} width={204} height={64} rx={10} />
      <text className="font-mono text-[13px] font-semibold fill-ink" x={418} y={77}>
        {labels.endpoint}
      </text>
      <text className="font-mono text-label fill-res-text" x={594} y={77} textAnchor="end">
        {format(labels.sent, { rows: num(s.loaded) })}
      </text>
      <text className={small} x={418} y={101}>
        {format(labels.apiNote, { total: num(s.total), page: num(s.pageSize) })}
      </text>

      <rect className={panel} x={388} y={144} width={236} height={192} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={404} y={168}>
        {labels.dom}
      </text>
      <text className="font-body text-[12.5px] fill-muted-text" x={404} y={196}>
        {labels.mountedRows}
      </text>
      <text
        className="font-mono text-[20px] font-semibold fill-ink"
        x={608}
        y={198}
        textAnchor="end"
      >
        {num(inDom)}
      </text>
      <rect x={404} y={208} width={204} height={8} rx={4} className="fill-line" />
      {inDom > 0 && (
        <rect
          x={404}
          y={208}
          width={Math.max(4, (204 * inDom) / s.total)}
          height={8}
          rx={4}
          className={cx(
            ease,
            nodes > s.nodeBudget ? 'fill-bad' : windowed ? 'fill-res' : 'fill-muted',
          )}
        />
      )}
      <text className={small} x={608} y={232} textAnchor="end">
        {format(labels.ofTotal, { total: num(s.total) })}
      </text>
      <text className="font-body text-[12.5px] fill-muted-text" x={404} y={252}>
        {labels.nodes}
      </text>
      <text className={small} x={404} y={269}>
        {format(labels.perRow, { n: s.nodesPerRow })}
      </text>
      <text
        className="font-mono text-[20px] font-semibold fill-ink"
        x={608}
        y={256}
        textAnchor="end"
      >
        {num(nodes)}
      </text>

      <g className={cx(ease, !s.contain && 'opacity-0')}>
        <rect
          className="fill-panel stroke-res stroke-[1.5]"
          x={404}
          y={282}
          width={204}
          height={24}
          rx={6}
        />
        <text className="font-mono text-label font-medium fill-res-text" x={416} y={298}>
          {labels.contain}
        </text>
        <text className="font-body text-micro fill-muted-text" x={404} y={324}>
          {labels.containNote}
        </text>
      </g>
      {labels.costs.map((text, i) => {
        const x = 404 + (i % 2) * 106;
        const y = 281 + Math.floor(i / 2) * 26;
        return (
          <g key={i} className={cx(ease, i >= s.costs && 'opacity-0')}>
            <rect
              className="fill-panel stroke-bad stroke-[1.5]"
              x={x}
              y={y}
              width={98}
              height={22}
              rx={6}
            />
            <text className="font-body text-meta font-medium fill-bad-text" x={x + 10} y={y + 15}>
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function metrics(s: VirtualizationState): [Metric, Metric, Metric] {
  const { labels } = s;
  const nodes = mountedRows(s) * s.nodesPerRow;
  const domTone = nodes > s.nodeBudget ? 'bad' : s.mounted === 'window' ? 'good' : undefined;
  return [
    { value: s.loaded === 0 ? labels.none : s.loaded.toLocaleString(labels.locale) },
    nodes === 0
      ? { value: labels.none }
      : domTone
        ? { value: nodes.toLocaleString(labels.locale), tone: domTone }
        : { value: nodes.toLocaleString(labels.locale) },
    s.cost,
  ];
}

export const virtualizationScene: SceneDefinition<VirtualizationState> = {
  viewBox: '0 0 640 352',
  // The API is on the right: a request runs from the browser to the API, its answer comes back.
  lanes: { fetch: { x1: 252, x2: 388, y: 70 } },
  Component: VirtualizationDrawing,
  metrics,
};
