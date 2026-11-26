import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 1, Optimistic UI: a browser panel and a server panel joined by one HTTP
 * lane, and a time strip under them that marks when the screen changes and when the server
 * answers. Ported from the first scene of reference/prototype.html.
 *
 * Pure: the same state always draws the same SVG. Every word on screen comes from the state
 * (`labels` and the fields the frames patch), which comes from the lesson data.
 */

/** How a status line is coloured. The words always say the same thing as the colour. */
export type StatusKind = 'none' | 'wait' | 'ok' | 'bad';

export interface Status {
  text: string;
  kind: StatusKind;
}

export interface OptimisticUiLabels {
  browser: string;
  server: string;
  database: string;
  lane: string;
  axis: string;
  /** The snapshot the browser keeps for a rollback, written out. */
  snapshot: string;
  uiChanges: string;
  serverAnswers: string;
  /** Template for a marker on the time strip: `{label}` and `{ms}`. */
  marker: string;
}

export interface OptimisticUiState {
  labels: OptimisticUiLabels;
  /** The card in the browser: its title, the button, and the value the button changes. */
  title: string;
  button: string;
  buttonOn: boolean;
  buttonPending: boolean;
  value: string;
  status: Status;
  /** Shows the snapshot strip under the card. */
  snapshot: boolean;
  /** The error toast. An empty string hides it. */
  toast: string;
  /** The server's record: a key, its value, and a note about the last request. */
  serverKey: string;
  serverValue: string;
  serverNote: Status;
  /**
   * Where the two markers on the time strip stand, in milliseconds: when the screen changed and
   * when the server answered. `null` until a marker has been placed, and then it waits at the
   * left edge. A marker that is not shown keeps its position (and so its text), so it fades out
   * where it stands; the lesson data says where, step by step (D14).
   */
  uiAt: number | null;
  serverAt: number | null;
  /** Whether each marker is visible. */
  uiShown: boolean;
  serverShown: boolean;
  /** The three metrics above the diagram, so the lesson data says what they show. */
  metrics: [Metric, Metric, Metric];
}

const AXIS = { x1: 16, x2: 624, y: 332, maxMs: 800 } as const;

const statusFill: Record<StatusKind, string> = {
  none: 'fill-muted-text',
  wait: 'fill-req-text',
  ok: 'fill-res-text',
  bad: 'fill-bad-text',
};

const cap = 'font-mono text-label tracking-caps-wide fill-muted-text';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const inner = 'fill-paper stroke-line stroke-[1.5]';
const heading = 'font-body text-[15px] font-semibold fill-ink';
const status = 'font-body text-[12.5px] font-medium transition-[fill] duration-(--duration-ui)';
const fade = 'transition-opacity duration-300';

/** Where a time marker sits on the strip, and which way its label leans so it stays inside. */
function markerPlacement(ms: number | null) {
  // A marker that has not been placed yet waits at the left edge, as the prototype's does.
  if (ms === null) return { x: 0, anchor: 'middle', labelX: 0 } as const;
  const x = AXIS.x1 + (ms / AXIS.maxMs) * (AXIS.x2 - AXIS.x1);
  const edge = x < 110 ? 'start' : x > 520 ? 'end' : 'middle';
  return { x, anchor: edge, labelX: edge === 'start' ? -8 : edge === 'end' ? 8 : 0 } as const;
}

/**
 * A marker on the time strip. Pure: where it stands, what it says and whether it shows all come
 * from the state. As in the prototype, a marker that goes away fades out where it stands and
 * keeps its text, because the state keeps its position while `shown` is false; the CSS
 * transition does the fading and the sliding.
 */
function Marker({
  at,
  shown,
  label,
  tone,
  below,
}: {
  at: number | null;
  shown: boolean;
  label: string;
  tone: 'req' | 'res';
  below: boolean;
}) {
  const { x, anchor, labelX } = markerPlacement(at);
  return (
    <g
      className="transition-[transform,opacity] duration-[500ms,300ms] ease-[ease]"
      style={{ opacity: shown ? 1 : 0, transform: `translate(${x}px, 0)` }}
    >
      <circle cy={AXIS.y} r={6} className={tone === 'req' ? 'fill-req' : 'fill-res'} />
      <text
        x={labelX}
        y={below ? AXIS.y + 22 : AXIS.y - 16}
        textAnchor={anchor}
        className={cx(
          'font-mono text-label font-medium',
          tone === 'req' ? 'fill-req-text' : 'fill-res-text',
        )}
      >
        {label}
      </text>
    </g>
  );
}

function OptimisticUiDrawing({ state }: { state: OptimisticUiState }) {
  const { labels } = state;
  const marker = (label: string, ms: number | null) =>
    ms === null ? '' : format(labels.marker, { label, ms });
  return (
    <g>
      <rect className={panel} x={16} y={16} width={236} height={262} rx={14} />
      <text className={cap} x={32} y={40}>
        {labels.browser}
      </text>
      <rect className={inner} x={32} y={52} width={204} height={150} rx={10} />
      <text className={heading} x={48} y={80}>
        {state.title}
      </text>
      <rect className="fill-line" x={48} y={94} width={150} height={7} rx={3.5} />
      <rect className="fill-line" x={48} y={108} width={112} height={7} rx={3.5} />
      <rect
        x={48}
        y={130}
        width={92}
        height={38}
        rx={19}
        strokeWidth={1.5}
        strokeDasharray={state.buttonPending ? '4 3' : undefined}
        className={cx(
          'transition-[fill,stroke,opacity] duration-(--duration-ui)',
          state.buttonOn ? 'fill-req-solid stroke-req-solid' : 'fill-panel stroke-ink',
          state.buttonPending && 'opacity-65',
        )}
      />
      <text
        x={94}
        y={154}
        textAnchor="middle"
        className={cx(
          'font-body text-[14px] font-semibold transition-[fill] duration-(--duration-ui)',
          state.buttonOn ? 'fill-on-signal' : 'fill-ink',
        )}
      >
        {state.button}
      </text>
      <text className="font-mono text-[20px] font-semibold fill-ink" x={154} y={155}>
        {state.value}
      </text>
      <text className={cx(status, statusFill[state.status.kind])} x={48} y={190}>
        {state.status.text}
      </text>

      <g className={cx(fade, !state.snapshot && 'opacity-0')}>
        <rect
          className="fill-none stroke-ev stroke-[1.5]"
          strokeDasharray="4 3"
          x={32}
          y={212}
          width={204}
          height={26}
          rx={7}
        />
        <text className="font-mono text-micro font-medium fill-ev-text" x={44} y={229}>
          {labels.snapshot}
        </text>
      </g>
      <g className={cx(fade, !state.toast && 'opacity-0')}>
        <rect className="fill-bad" x={32} y={244} width={204} height={26} rx={7} />
        <text className="font-body text-meta font-medium fill-on-signal" x={44} y={261}>
          {state.toast}
        </text>
      </g>

      <rect className={panel} x={388} y={16} width={236} height={262} rx={14} />
      <text className={cap} x={404} y={40}>
        {labels.server}
      </text>
      <rect className={inner} x={404} y={52} width={204} height={150} rx={10} />
      <text className={cap} x={420} y={80}>
        {labels.database}
      </text>
      <text className="font-mono text-meta font-medium fill-muted-text" x={420} y={116}>
        {state.serverKey}
      </text>
      <text className="font-mono text-[28px] font-semibold fill-ink" x={420} y={154}>
        {state.serverValue}
      </text>
      <text className={cx(status, statusFill[state.serverNote.kind])} x={420} y={188}>
        {state.serverNote.text}
      </text>

      <line
        className="stroke-line stroke-2 [stroke-dasharray:3_5]"
        x1={252}
        y1={130}
        x2={388}
        y2={130}
      />
      <text className={cap} x={320} y={156} textAnchor="middle">
        {labels.lane}
      </text>

      <line className="stroke-line stroke-2" x1={AXIS.x1} y1={AXIS.y} x2={AXIS.x2} y2={AXIS.y} />
      <text className={cap} x={AXIS.x2} y={356} textAnchor="end">
        {labels.axis}
      </text>
      <Marker
        at={state.uiAt}
        shown={state.uiShown}
        label={marker(labels.uiChanges, state.uiAt)}
        tone="req"
        below={false}
      />
      <Marker
        at={state.serverAt}
        shown={state.serverShown}
        label={marker(labels.serverAnswers, state.serverAt)}
        tone="res"
        below
      />
    </g>
  );
}

export const optimisticUiScene: SceneDefinition<OptimisticUiState> = {
  viewBox: '0 0 640 364',
  lanes: { main: { x1: 252, x2: 388, y: 130 } },
  Component: OptimisticUiDrawing,
  metrics: (state) => state.metrics,
};
