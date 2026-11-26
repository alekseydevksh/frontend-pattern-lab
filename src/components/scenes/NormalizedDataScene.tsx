'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 4, Normalized Data: three columns. On the left, a nested API response that
 * carries the same author under a feed post, a profile and a comment, and below it an update card
 * (the server renames the user). In the middle, the client's store: either one copy of the user
 * per response, or one `users` record that three references point to. On the right, three views
 * (feed, profile, comments) and, below them, the cache plan a query library still leaves to you.
 *
 * Pure: the same state always draws the same SVG. The picture is a small simulation with one user
 * and three places that mention them. Every word on screen, the names and the id included, comes
 * from the state (`labels` and the fields the frames patch), which comes from the lesson data.
 * A copy, a record or a view whose name differs from `latest` is drawn stale, with the word.
 */

type Triple<T> = [T, T, T];

export interface NormalizedLabels {
  /** The note that the names and counts in the drawing are made up. */
  illustrative: string;
  response: string;
  store: string;
  screen: string;
  update: string;
  plan: string;
  /** The store's note: copies kept per response, or records kept by id. */
  byResponse: string;
  byId: string;
  /** The path of the author in each response, also the caption of each reference. */
  paths: Triple<string>;
  /** Templates: `{n}`; `{id}`; `{name}`. */
  copy: string;
  idLine: string;
  nameLine: string;
  /** What a reference reads: `{id}`. */
  reference: string;
  /** What a view reads: `{name}`. */
  by: string;
  views: Triple<string>;
  stale: string;
  users: string;
  /** Template: `{n}`. */
  references: string;
  noRecord: string;
  noRecordNote: string;
  noUpdate: string;
  /** Template: `{id}`. */
  updateTitle: string;
  /** The three parts of the plan, in the order they light up. */
  plans: Triple<string>;
  /** The "views in sync" metric. Template: `{n}`, `{total}`. */
  syncOf: string;
  none: string;
}

export interface NormalizedState {
  labels: NormalizedLabels;
  /** The id of the user that every place mentions. */
  userId: string;
  /** The name in the response the server sent. */
  fetched: string;
  /** What the store holds: a copy per response, or one record by id. */
  mode: 'copies' | 'entities';
  /** The copies, one per response (in `copies` mode). `null`: not loaded yet. */
  names: Triple<string | null>;
  /** The one record (in `entities` mode). */
  entity: string | null;
  /** The name each view shows. `null`: nothing to show yet. */
  view: Triple<string | null>;
  /** The name on the server. Anything else is stale. */
  latest: string;
  /** Whether the server has announced the rename (the update card shows it). */
  sent: boolean;
  /** Whether the repeated author is marked in the response. */
  flag: boolean;
  /** How many parts of the cache plan are lit. */
  plan: number;
}

const ROW_Y = [64, 126, 188] as const;
const ROW_H = 52;
const ROW_X = 246;
const ROW_W = 150;
const mid = (i: number) => ROW_Y[i]! + ROW_H / 2;
const ENTITY = { y: 278, h: 76 } as const;
const UPDATE_Y = 327;

const cap = 'font-mono text-label tracking-caps-wide';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const small = 'font-mono text-micro fill-muted-text';
const note = 'font-body text-micro fill-muted-text';
const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';
const link = 'stroke-line stroke-2 [stroke-dasharray:3_5]';

const isStale = (s: NormalizedState, name: string | null) => name !== null && name !== s.latest;

/** How many places in the store hold the user: one copy per response, or the one record. */
export function copyCount(s: NormalizedState): number {
  return s.mode === 'copies' ? s.names.filter((n) => n !== null).length : s.entity === null ? 0 : 1;
}

/** How many stored places do not hold the latest name yet: the writes still needed. */
export function writesNeeded(s: NormalizedState): number {
  if (s.mode === 'copies') return s.names.filter((n) => isStale(s, n)).length;
  return isStale(s, s.entity) ? 1 : 0;
}

/** How many of the three views show the latest name. */
export function viewsInSync(s: NormalizedState): number {
  return s.view.filter((n) => n === s.latest).length;
}

/** A small "stale" tag in the top right corner of a card. */
function StaleTag({ right, y, text }: { right: number; y: number; text: string }) {
  return (
    <g>
      <rect
        x={right - 44}
        y={y}
        width={44}
        height={15}
        rx={4}
        className="fill-panel stroke-bad stroke-[1.5]"
      />
      <text
        x={right - 22}
        y={y + 11}
        textAnchor="middle"
        className="font-mono text-micro font-semibold fill-bad-text"
      >
        {text}
      </text>
    </g>
  );
}

function PanelBox(props: { x: number; y: number; w: number; h: number; title: string }) {
  return (
    <g>
      <rect className={panel} x={props.x} y={props.y} width={props.w} height={props.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={props.x + 16} y={props.y + 24}>
        {props.title}
      </text>
    </g>
  );
}

function NormalizedDrawing({ state: s }: { state: NormalizedState }) {
  const { labels } = s;
  const entities = s.mode === 'entities';
  const entityStale = isStale(s, s.entity);
  const planShown = s.plan > 0;

  return (
    <g>
      <text className={small} x={624} y={16} textAnchor="end">
        {labels.illustrative}
      </text>

      {/* The links between the columns, which the packets travel along. */}
      {ROW_Y.map((_, i) => (
        <g key={i}>
          <line className={link} x1={172} y1={mid(i)} x2={232} y2={mid(i)} />
          <line className={link} x1={408} y1={mid(i)} x2={468} y2={mid(i)} />
        </g>
      ))}
      <line className={link} x1={172} y1={UPDATE_Y} x2={232} y2={UPDATE_Y} />

      {/* The nested response: the same author under three parents. */}
      <PanelBox x={16} y={28} w={156} h={228} title={labels.response} />
      {ROW_Y.map((y, i) => (
        <g key={i}>
          <rect
            x={28}
            y={y}
            width={132}
            height={ROW_H}
            rx={8}
            strokeWidth={1.5}
            className={cx(ease, 'fill-paper', s.flag ? 'stroke-res' : 'stroke-line')}
          />
          <text x={38} y={y + 16} className={small}>
            {labels.paths[i]}
          </text>
          <text x={38} y={y + 31} className={small}>
            {format(labels.idLine, { id: s.userId })}
          </text>
          <text
            x={38}
            y={y + 45}
            className={cx(ease, 'font-mono text-label', s.flag ? 'fill-res-text' : 'fill-ink')}
          >
            {format(labels.nameLine, { name: s.fetched })}
          </text>
        </g>
      ))}

      {/* The update the server announces. */}
      <PanelBox x={16} y={268} w={156} h={96} title={labels.update} />
      <rect
        x={28}
        y={302}
        width={132}
        height={50}
        rx={8}
        strokeWidth={1.5}
        strokeDasharray={s.sent ? undefined : '4 3'}
        className={cx(ease, 'fill-paper', s.sent ? 'stroke-ev' : 'stroke-line')}
      />
      {s.sent ? (
        <>
          <text x={38} y={321} className={small}>
            {format(labels.updateTitle, { id: s.userId })}
          </text>
          <text x={38} y={340} className="font-mono text-label fill-ev-text">
            {format(labels.nameLine, { name: s.latest })}
          </text>
        </>
      ) : (
        <text x={94} y={331} textAnchor="middle" className={note}>
          {labels.noUpdate}
        </text>
      )}

      {/* The store. */}
      <PanelBox x={232} y={28} w={176} h={336} title={labels.store} />
      <text className={small} x={396} y={52} textAnchor="end">
        {entities ? labels.byId : labels.byResponse}
      </text>

      <g className={cx(ease, entities && 'opacity-0')}>
        {ROW_Y.map((y, i) => {
          const name = s.names[i] ?? null;
          const stale = isStale(s, name);
          return (
            <g key={i}>
              <rect
                x={ROW_X}
                y={y}
                width={ROW_W}
                height={ROW_H}
                rx={8}
                strokeWidth={1.5}
                strokeDasharray={name === null ? '4 3' : undefined}
                className={cx(ease, 'fill-paper', stale ? 'stroke-bad' : 'stroke-line')}
              />
              {name !== null && (
                <>
                  <text x={ROW_X + 10} y={y + 16} className={cx(cap, 'fill-muted-text')}>
                    {format(labels.copy, { n: i + 1 })}
                  </text>
                  <text x={ROW_X + 10} y={y + 31} className={small}>
                    {format(labels.idLine, { id: s.userId })}
                  </text>
                  <text
                    x={ROW_X + 10}
                    y={y + 45}
                    className={cx(
                      ease,
                      'font-mono text-label',
                      stale ? 'fill-bad-text' : 'fill-ink',
                    )}
                  >
                    {format(labels.nameLine, { name })}
                  </text>
                  {stale && <StaleTag right={ROW_X + ROW_W - 8} y={y + 5} text={labels.stale} />}
                </>
              )}
            </g>
          );
        })}
        <rect
          x={ROW_X}
          y={ENTITY.y}
          width={ROW_W}
          height={ENTITY.h}
          rx={8}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="fill-none stroke-line"
        />
        <text
          x={ROW_X + ROW_W / 2}
          y={ENTITY.y + 33}
          textAnchor="middle"
          className={cx(cap, 'fill-bad-text')}
        >
          {labels.noRecord}
        </text>
        <text x={ROW_X + ROW_W / 2} y={ENTITY.y + 51} textAnchor="middle" className={note}>
          {labels.noRecordNote}
        </text>
      </g>

      <g className={cx(ease, !entities && 'opacity-0')}>
        <path
          d={`M${ROW_X} ${mid(0)}H239V${ENTITY.y + ENTITY.h / 2}H${ROW_X}M${ROW_X} ${mid(1)}H239M${ROW_X} ${mid(2)}H239`}
          strokeWidth={1.5}
          className="fill-none stroke-res"
        />
        {ROW_Y.map((y, i) => (
          <g key={i}>
            <rect
              x={ROW_X}
              y={y}
              width={ROW_W}
              height={ROW_H}
              rx={8}
              strokeWidth={1.5}
              className="fill-paper stroke-line"
            />
            <text x={ROW_X + 10} y={y + 18} className={small}>
              {labels.paths[i]}
            </text>
            <text
              x={ROW_X + 10}
              y={y + 41}
              className="font-mono text-[13px] font-semibold fill-res-text"
            >
              {format(labels.reference, { id: s.userId })}
            </text>
          </g>
        ))}
        <rect
          x={ROW_X}
          y={ENTITY.y}
          width={ROW_W}
          height={ENTITY.h}
          rx={8}
          strokeWidth={1.5}
          className={cx(ease, 'fill-paper', entityStale ? 'stroke-bad' : 'stroke-res')}
        />
        <text x={ROW_X + 10} y={ENTITY.y + 17} className={cx(cap, 'fill-muted-text')}>
          {labels.users}
        </text>
        {s.entity !== null && (
          <>
            <text
              x={ROW_X + 10}
              y={ENTITY.y + 43}
              className="font-mono text-[13px] font-semibold fill-muted-text"
            >
              {s.userId}
            </text>
            <text
              x={ROW_X + 38}
              y={ENTITY.y + 43}
              className={cx(
                ease,
                'font-mono text-[13px] font-semibold',
                entityStale ? 'fill-bad-text' : 'fill-ink',
              )}
            >
              {s.entity}
            </text>
            <text x={ROW_X + 10} y={ENTITY.y + 64} className={note}>
              {format(labels.references, { n: ROW_Y.length })}
            </text>
            {entityStale && (
              <StaleTag right={ROW_X + ROW_W - 8} y={ENTITY.y + 5} text={labels.stale} />
            )}
          </>
        )}
      </g>

      {/* The screen: three views of the user. */}
      <PanelBox x={468} y={28} w={156} h={228} title={labels.screen} />
      {ROW_Y.map((y, i) => {
        const name = s.view[i] ?? null;
        const stale = isStale(s, name);
        return (
          <g key={i}>
            <rect
              x={480}
              y={y}
              width={132}
              height={ROW_H}
              rx={8}
              strokeWidth={1.5}
              strokeDasharray={name === null ? '4 3' : undefined}
              className={cx(ease, 'fill-paper', stale ? 'stroke-bad' : 'stroke-line')}
            />
            {name !== null && (
              <>
                <text x={490} y={y + 18} className={cx(cap, 'fill-muted-text')}>
                  {labels.views[i]}
                </text>
                <text
                  x={490}
                  y={y + 40}
                  className={cx(
                    ease,
                    'font-body text-[13px] font-semibold',
                    stale ? 'fill-bad-text' : 'fill-ink',
                  )}
                >
                  {format(labels.by, { name })}
                </text>
                {stale && <StaleTag right={604} y={y + 6} text={labels.stale} />}
              </>
            )}
          </g>
        );
      })}

      {/* The plan a query library still leaves to you. */}
      <g className={cx(ease, !planShown && 'opacity-0')}>
        <PanelBox x={468} y={268} w={156} h={96} title={labels.plan} />
        {labels.plans.map((text, i) => (
          <g key={i} className={cx(ease, i >= s.plan && 'opacity-0')}>
            <rect
              x={480}
              y={298 + i * 21}
              width={132}
              height={18}
              rx={6}
              strokeWidth={1.5}
              className="fill-paper stroke-res"
            />
            <text
              x={489}
              y={298 + i * 21 + 12.5}
              className="font-body text-micro font-medium fill-res-text"
            >
              {text}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

function metrics(s: NormalizedState): [Metric, Metric, Metric] {
  const { labels } = s;
  const copies = copyCount(s);
  const loaded = s.view.some((n) => n !== null);
  const inSync = viewsInSync(s);
  const writes = writesNeeded(s);

  const copiesMetric: Metric =
    copies === 0
      ? { value: labels.none }
      : copies > 1
        ? { value: String(copies), tone: 'bad' }
        : s.mode === 'entities'
          ? { value: String(copies), tone: 'good' }
          : { value: String(copies) };

  const total = s.view.length;
  const syncText = format(labels.syncOf, { n: inSync, total });
  const syncMetric: Metric = !loaded
    ? { value: labels.none }
    : inSync < total
      ? { value: syncText, tone: 'bad' }
      : s.mode === 'entities'
        ? { value: syncText, tone: 'good' }
        : { value: syncText };

  const writesMetric: Metric =
    copies === 0
      ? { value: labels.none }
      : writes > 0
        ? { value: String(writes), tone: 'bad' }
        : s.sent
          ? { value: String(writes), tone: 'good' }
          : { value: String(writes) };

  return [copiesMetric, syncMetric, writesMetric];
}

export const normalizedDataScene: SceneDefinition<NormalizedState> = {
  viewBox: '0 0 640 380',
  // Responses run from the left column into the store, the update the same way along the bottom,
  // and a change in the store runs on into the views on the right.
  lanes: {
    load0: { x1: 172, x2: 232, y: mid(0) },
    load1: { x1: 172, x2: 232, y: mid(1) },
    load2: { x1: 172, x2: 232, y: mid(2) },
    write: { x1: 172, x2: 232, y: UPDATE_Y },
    read0: { x1: 408, x2: 468, y: mid(0) },
    read1: { x1: 408, x2: 468, y: mid(1) },
    read2: { x1: 408, x2: 468, y: mid(2) },
  },
  Component: NormalizedDrawing,
  metrics,
};
