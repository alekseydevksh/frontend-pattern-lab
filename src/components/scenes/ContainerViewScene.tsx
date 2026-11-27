'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 8, Container, View, ViewModel: one offer, from the backend's payload to the
 * pixels. At first a single component does everything: its rows are tagged FETCH, DECIDE or DRAW, in
 * the order they sit in the code. Then three columns take over, one job each: the container asks the
 * backend and holds the raw payload, the view model turns it into a small model in screen words, and
 * the view draws that model, or its loading and error states. A packet crosses the lane along the top
 * as the data moves from one column to the next.
 *
 * State is never colour alone: every row carries its job in a word, the request line says loading,
 * ready or failed in words, the view says "Loading…" or "Could not load" in words, and the decisions
 * that are still in the view are listed under a heading that says so.
 *
 * Pure: the same state always draws the same SVG. Positions are constants of the drawing and every
 * word on screen comes from the state, which comes from the lesson data. The styles it uses are
 * written out below, not imported from `sceneKit` (D22).
 */

// The few styles this scene uses, written out here and not imported from `sceneKit`: a module that
// two lesson routes import is put in a chunk of its own, which costs each page about 0.4 KB
// (D21, D22). The same strings live in `sceneKit` for the lessons that gain from sharing them.
const cap = 'font-mono text-label tracking-caps-wide';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const small = 'font-mono text-micro fill-muted-text';
const note = 'font-body text-micro fill-muted-text';
const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';
type ToneKey = 'req' | 'res' | 'ev' | 'bad' | 'muted';
const toneStroke = {
  req: 'stroke-req',
  res: 'stroke-res',
  ev: 'stroke-ev',
  bad: 'stroke-bad',
  muted: 'stroke-muted',
} as const satisfies Record<ToneKey, string>;
const toneText = {
  req: 'fill-req-text',
  res: 'fill-res-text',
  ev: 'fill-ev-text',
  bad: 'fill-bad-text',
  muted: 'fill-muted-text',
} as const satisfies Record<ToneKey, string>;
/** The advance of one character of IBM Plex Mono at the micro size. */
const MICRO_CHAR = 6.3;

export type Job = 'fetch' | 'decide' | 'draw';

/** One row of the single component, or one decision left in the view. */
export interface Line {
  job: Job;
  text: string;
}

/** A field of the backend payload. */
export interface Field {
  name: string;
  value: string;
}

export type RequestState = 'idle' | 'loading' | 'ready' | 'error';
export type ViewKind = 'blank' | 'loading' | 'ready' | 'error';

/** What the view draws: the backend's payload, said in screen words. */
export interface OfferModel {
  title: string;
  price: string;
  status: string;
  expiry: string;
  actions: string[];
}

export interface LayersLabels {
  /** The note that the payload and the requests are made up. */
  illustrative: string;
  oneComponent: string;
  oneComponentNote: string;
  /** The word on a row of the single component. */
  jobs: Record<Job, string>;
  /** CONTAINER, VIEW MODEL, VIEW. */
  columns: [string, string, string];
  /** What each column does, in a few words. */
  roles: [string, string, string];
  payload: string;
  /** The request line. Template: `{state}`. */
  request: string;
  requestStates: Record<RequestState, string>;
  /** The names of the model's five fields, in the order the view model builds them. */
  modelFields: [string, string, string, string, string];
  /** The backend field each model field comes from. */
  from: [string, string, string, string, string];
  /** Under a model field. Template: `{name}`. */
  fromTemplate: string;
  /** Under the model: the payload fields that the screen does not need. */
  leftOut: string;
  logicHere: string;
  blank: string;
  loading: string;
  error: string;
  retry: string;
}

export interface LayersState {
  labels: LayersLabels;
  /** Whether one component does everything (true), or the three layers do. */
  tangled: boolean;
  /** The rows of the single component. */
  tangle: Line[];
  /** The requests the container has made, as written. */
  calls: string[];
  request: RequestState;
  /** The backend payload the container holds; empty before the response. */
  payload: Field[];
  /** How many of the model's five fields the view model has built. */
  mapped: number;
  model: OfferModel;
  /** The decisions still made inside the view, once there are three layers. */
  logic: Line[];
  view: ViewKind;
}

const JOB_TONE = { fetch: 'req', decide: 'ev', draw: 'res' } as const satisfies Record<
  Job,
  ToneKey
>;
const COLUMN_TONE = ['req', 'ev', 'res'] as const satisfies readonly ToneKey[];
const REQUEST_TONE = {
  idle: 'muted',
  loading: 'req',
  ready: 'res',
  error: 'bad',
} as const satisfies Record<RequestState, ToneKey>;

const TOP = 76;
const COL = { w: 184, h: 328, xs: [16, 228, 440] } as const;
const BOX = { x: 16, w: 608, h: 328 } as const;
const ROW = { y: 96, pitch: 28 } as const;
const PAYLOAD_ROW = 20;
const MAP_ROW = 32;

/** The width of a chip around `text` in the micro mono size: its characters plus `padding`. */
const microWidth = (text: string, padding: number) => text.length * MICRO_CHAR + padding;

/** The decisions in the view, or in the single component: what the third metric counts. */
export function logicCount(s: LayersState): number {
  return s.tangled ? s.tangle.filter((l) => l.job === 'decide').length : s.logic.length;
}

/** The width of the chips of a row of payload names. It must fit the box. */
export function chipsRowWidth(names: string[]): number {
  return names.reduce((sum, n) => sum + microWidth(n, 12), 0) + Math.max(0, names.length - 1) * 6;
}

function Tangle({ s }: { s: LayersState }) {
  const { labels } = s;
  const lefts = s.payload.map((_, j) =>
    s.payload.slice(0, j).reduce<number>((x, f) => x + microWidth(f.name, 12) + 6, 32),
  );
  return (
    <g>
      <rect className={panel} x={BOX.x} y={TOP} width={BOX.w} height={BOX.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={TOP + 24}>
        {labels.oneComponent}
      </text>
      <text
        x={BOX.x + BOX.w - 16}
        y={TOP + 24}
        textAnchor="end"
        className="font-mono text-micro font-semibold tracking-caps fill-bad-text"
      >
        {labels.oneComponentNote}
      </text>
      {s.payload.length > 0 && (
        <g>
          <text x={32} y={TOP + 46} className={small}>
            {labels.payload}
          </text>
          {s.payload.map((field, j) => (
            <g key={field.name}>
              <rect
                x={lefts[j]!}
                y={TOP + 54}
                width={microWidth(field.name, 12)}
                height={20}
                rx={5}
                className="fill-paper stroke-res stroke-[1.5]"
              />
              <text
                x={lefts[j]! + 6}
                y={TOP + 68}
                className="font-mono text-micro font-semibold fill-res-text"
              >
                {field.name}
              </text>
            </g>
          ))}
        </g>
      )}
      {s.tangle.map((line, i) => {
        const y = TOP + ROW.y + i * ROW.pitch;
        const tone = JOB_TONE[line.job];
        return (
          <g key={i} data-job={line.job}>
            <rect
              x={32}
              y={y}
              width={60}
              height={20}
              rx={5}
              className={cx('fill-paper stroke-[1.5]', toneStroke[tone])}
            />
            <text
              x={62}
              y={y + 14}
              textAnchor="middle"
              className={cx('font-mono text-micro font-semibold tracking-caps', toneText[tone])}
            >
              {labels.jobs[line.job]}
            </text>
            <text x={104} y={y + 14.5} className="font-mono text-[11.5px] fill-ink">
              {line.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Column({ s, i }: { s: LayersState; i: number }) {
  const { labels } = s;
  const x = COL.xs[i]!;
  const tone = COLUMN_TONE[i]!;
  return (
    <g>
      <rect
        x={x}
        y={TOP}
        width={COL.w}
        height={COL.h}
        rx={14}
        className={cx('fill-panel stroke-[1.5]', toneStroke[tone])}
      />
      <text x={x + 14} y={TOP + 24} className={cx(cap, 'font-semibold', toneText[tone])}>
        {labels.columns[i]}
      </text>
      <text x={x + 14} y={TOP + 40} className={note}>
        {labels.roles[i]}
      </text>
    </g>
  );
}

function Container({ s }: { s: LayersState }) {
  const { labels } = s;
  const x = COL.xs[0];
  return (
    <g>
      <text
        x={x + 14}
        y={TOP + 62}
        className={cx('font-mono text-[11.5px] font-semibold', toneText[REQUEST_TONE[s.request]])}
      >
        {format(labels.request, { state: labels.requestStates[s.request] })}
      </text>
      {s.calls.map((call, i) => (
        <text key={i} x={x + 14} y={TOP + 80 + i * 14} className="font-mono text-micro fill-ink">
          {call}
        </text>
      ))}
      {s.payload.length > 0 && (
        <g>
          <text x={x + 14} y={TOP + 124} className={small}>
            {labels.payload}
          </text>
          {s.payload.map((field, i) => (
            <g key={field.name}>
              <rect
                x={x + 10}
                y={TOP + 132 + i * PAYLOAD_ROW}
                width={COL.w - 20}
                height={17}
                rx={4}
                className="fill-paper stroke-res stroke-[1.5]"
              />
              <text
                x={x + 16}
                y={TOP + 144.5 + i * PAYLOAD_ROW}
                className="font-mono text-micro fill-ink"
              >
                {`${field.name}: ${field.value}`}
              </text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/** The value of the model's field `i`, as the view model writes it. */
function modelValue(model: OfferModel, i: number): string {
  return [model.title, model.price, model.status, model.expiry, model.actions.join(' · ')][i]!;
}

function ViewModel({ s }: { s: LayersState }) {
  const { labels } = s;
  const x = COL.xs[1];
  return (
    <g>
      {Array.from({ length: s.mapped }, (_, i) => (
        <g key={i}>
          <text
            x={x + 14}
            y={TOP + 66 + i * MAP_ROW}
            className="font-mono text-[11.5px] font-semibold fill-ink"
          >
            {`${labels.modelFields[i]}: ${modelValue(s.model, i)}`}
          </text>
          <text x={x + 14} y={TOP + 80 + i * MAP_ROW} className={small}>
            {format(labels.fromTemplate, { name: labels.from[i]! })}
          </text>
        </g>
      ))}
      {s.mapped > 0 && (
        <text x={x + 14} y={TOP + 66 + 5 * MAP_ROW + 8} className={note}>
          {labels.leftOut}
        </text>
      )}
    </g>
  );
}

function ViewCard({ s }: { s: LayersState }) {
  const { labels, model } = s;
  const x = COL.xs[2] + 10;
  const y = TOP + 160;
  const w = COL.w - 20;
  const h = 150;
  const bars = [0, 1, 2];
  const pill = microWidth(model.status, 16);
  return (
    <g data-view={s.view}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        strokeDasharray={s.view === 'blank' ? '4 3' : undefined}
        className={cx(
          ease,
          'fill-paper stroke-[1.5]',
          s.view === 'error' ? 'stroke-bad' : s.view === 'blank' ? 'stroke-line' : 'stroke-res',
        )}
      />
      {s.view === 'blank' && (
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className={note}>
          {labels.blank}
        </text>
      )}
      {s.view === 'loading' && (
        <g>
          {bars.map((b) => (
            <rect
              key={b}
              x={x + 12}
              y={y + 16 + b * 22}
              width={b === 0 ? 100 : b === 1 ? 70 : 120}
              height={12}
              rx={4}
              className="fill-line"
            />
          ))}
          <text
            x={x + w / 2}
            y={y + h - 22}
            textAnchor="middle"
            className="font-mono text-micro font-semibold tracking-caps fill-req-text"
          >
            {labels.loading}
          </text>
        </g>
      )}
      {s.view === 'error' && (
        <g>
          <text
            x={x + w / 2}
            y={y + 62}
            textAnchor="middle"
            className="font-mono text-micro font-semibold tracking-caps fill-bad-text"
          >
            {labels.error}
          </text>
          <rect
            x={x + w / 2 - 40}
            y={y + 82}
            width={80}
            height={22}
            rx={6}
            className="fill-panel stroke-bad stroke-[1.5]"
          />
          <text
            x={x + w / 2}
            y={y + 97}
            textAnchor="middle"
            className="font-mono text-micro font-semibold fill-bad-text"
          >
            {labels.retry}
          </text>
        </g>
      )}
      {s.view === 'ready' && (
        <g>
          <text x={x + 12} y={y + 26} className="font-mono text-[12px] font-semibold fill-ink">
            {model.title}
          </text>
          <text x={x + 12} y={y + 46} className="font-mono text-[11.5px] fill-ink">
            {model.price}
          </text>
          <rect
            x={x + 12}
            y={y + 56}
            width={pill}
            height={18}
            rx={9}
            className="fill-panel stroke-res stroke-[1.5]"
          />
          <text
            x={x + 20}
            y={y + 68.5}
            className="font-mono text-micro font-semibold fill-res-text"
          >
            {model.status}
          </text>
          <text x={x + 12} y={y + 92} className={small}>
            {model.expiry}
          </text>
          {model.actions.map((action, i) => (
            <g key={action}>
              <rect
                x={x + 12 + i * 70}
                y={y + 108}
                width={62}
                height={24}
                rx={6}
                className="fill-panel stroke-line stroke-[1.5]"
              />
              <text
                x={x + 43 + i * 70}
                y={y + 123.5}
                textAnchor="middle"
                className="font-mono text-micro font-semibold fill-ink"
              >
                {action}
              </text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function View({ s }: { s: LayersState }) {
  const { labels } = s;
  const x = COL.xs[2];
  return (
    <g>
      {s.logic.length > 0 && (
        <g>
          <text
            x={x + 14}
            y={TOP + 62}
            className="font-mono text-micro font-semibold tracking-caps fill-bad-text"
          >
            {labels.logicHere}
          </text>
          {s.logic.map((line, i) => (
            <text
              key={i}
              x={x + 14}
              y={TOP + 78 + i * 14}
              className="font-mono text-micro fill-ink"
            >
              {line.text}
            </text>
          ))}
        </g>
      )}
      <ViewCard s={s} />
    </g>
  );
}

function LayersDrawing({ state: s }: { state: LayersState }) {
  return (
    <g>
      <text className={small} x={624} y={16} textAnchor="end">
        {s.labels.illustrative}
      </text>
      {s.tangled ? (
        <Tangle s={s} />
      ) : (
        <g>
          {[0, 1, 2].map((i) => (
            <Column key={i} s={s} i={i} />
          ))}
          <Container s={s} />
          <ViewModel s={s} />
          <View s={s} />
        </g>
      )}
    </g>
  );
}

function metrics(s: LayersState): [Metric, Metric, Metric] {
  const logic = logicCount(s);
  return [
    { value: String(s.payload.length) },
    { value: String(s.mapped) },
    { value: String(logic), tone: logic > 0 ? 'bad' : 'good' },
  ];
}

export const containerViewScene: SceneDefinition<LayersState> = {
  viewBox: '0 0 640 440',
  // Along the top: to and from the backend, from the container to the view model, and on to the view.
  lanes: {
    backend: { x1: 16, x2: 108, y: 58 },
    pass: { x1: 108, x2: 320, y: 58 },
    show: { x1: 320, x2: 532, y: 58 },
  },
  Component: LayersDrawing,
  metrics,
};
