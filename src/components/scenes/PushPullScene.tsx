import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 2, Push + Pull Sync: a browser with a document list and a pending badge,
 * the server as the source of truth, a push lane (a socket) and a pull lane (HTTP), and a
 * socket status light. Ported from the second scene of reference/prototype.html.
 *
 * Pure: the same state always draws the same SVG. Every word on screen comes from the state
 * (`labels`, `docs` and the fields the frames patch), which comes from the lesson data.
 */

export type DocStatus = 'pending' | 'signed';
export type SocketStatus = 'open' | 'down';

export interface PushPullLabels {
  browser: string;
  server: string;
  /** The title of the list in the browser, and of the list on the server. */
  documents: string;
  sourceOfTruth: string;
  push: string;
  websocket: string;
  pull: string;
  http: string;
  /** Status words. `unknown` is shown before the first load; `refreshing` during a refetch. */
  pending: string;
  signed: string;
  refreshing: string;
  unknown: string;
  /** Template for the socket light: `{status}`. */
  socket: string;
  open: string;
  down: string;
  /** Template for the note under the browser list: `{event}`. */
  event: string;
  /** The words the first metric uses. `none` stands for "not known yet". */
  inSync: string;
  stale: string;
  none: string;
}

export interface PushPullState {
  labels: PushPullLabels;
  /** Three document names. The browser and the server list the same three. */
  docs: [string, string, string];
  /** What the browser shows for each document; null before the first load. */
  ui: Array<DocStatus | null>;
  /** What the server holds for each document. */
  srv: DocStatus[];
  /** The count in the pending badge; null hides it. */
  badge: number | null;
  /** The toast text. An empty string hides it. */
  toast: string;
  socket: SocketStatus;
  /** Index of the document being refetched, or -1. */
  refetch: number;
  /** False until the first request has come back. */
  loaded: boolean;
  /** The name of the event the browser last heard, or null. */
  event: string | null;
}

const cap = 'font-mono text-label tracking-caps-wide fill-muted-text';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const inner = 'fill-paper stroke-line stroke-[1.5]';
const heading = 'font-body text-[15px] font-semibold fill-ink';
const lane = 'stroke-line stroke-2 [stroke-dasharray:3_5]';

const statusText: Record<DocStatus | 'refreshing' | 'unknown', string> = {
  pending: 'fill-req-text',
  signed: 'fill-res-text',
  refreshing: 'fill-ev-text',
  unknown: 'fill-muted-text',
};

function statusWord(labels: PushPullLabels, status: DocStatus | null, refreshing: boolean) {
  if (refreshing) return labels.refreshing;
  return status === null ? labels.unknown : labels[status];
}

function PushPullDrawing({ state }: { state: PushPullState }) {
  const { labels } = state;
  const socketUp = state.socket === 'open';
  return (
    <g>
      <rect className={panel} x={16} y={16} width={236} height={280} rx={14} />
      <text className={cap} x={32} y={40}>
        {labels.browser}
      </text>
      <rect className={inner} x={32} y={52} width={204} height={236} rx={10} />
      <text className={heading} x={48} y={77}>
        {labels.documents}
      </text>
      <g style={{ opacity: state.badge === null ? 0 : 1 }}>
        <circle className="fill-req-solid" cx={212} cy={70} r={12} />
        <text
          className="font-mono text-meta font-semibold fill-on-signal"
          x={212}
          y={74.5}
          textAnchor="middle"
        >
          {state.badge ?? ''}
        </text>
      </g>

      <rect className={panel} x={388} y={16} width={236} height={280} rx={14} />
      <text className={cap} x={404} y={40}>
        {labels.server}
      </text>
      <rect className={inner} x={404} y={52} width={204} height={236} rx={10} />
      <text className={heading} x={420} y={77}>
        {labels.sourceOfTruth}
      </text>

      {state.docs.map((name, i) => {
        const y = 90 + i * 44;
        const shown = state.ui[i] ?? null;
        const refreshing = state.refetch === i;
        const serverValue = state.srv[i] ?? 'pending';
        const stale = shown !== null && !refreshing && shown !== serverValue;
        return (
          <g key={i}>
            <rect
              x={44}
              y={y}
              width={180}
              height={36}
              rx={8}
              strokeWidth={1.5}
              strokeDasharray={stale ? '4 3' : undefined}
              className={cx(
                'fill-panel transition-[stroke] duration-(--duration-ui)',
                stale ? 'stroke-bad' : refreshing ? 'stroke-res' : 'stroke-line',
              )}
            />
            <text className="font-body text-[13px] font-medium fill-ink" x={56} y={y + 23}>
              {name}
            </text>
            <text
              x={212}
              y={y + 23}
              textAnchor="end"
              className={cx(
                'font-mono text-[11.5px] font-semibold transition-[fill] duration-(--duration-ui)',
                statusText[refreshing ? 'refreshing' : (shown ?? 'unknown')],
              )}
            >
              {statusWord(labels, shown, refreshing)}
            </text>

            <rect className={panel} x={416} y={y} width={180} height={36} rx={8} />
            <text className="font-body text-[13px] font-medium fill-ink" x={428} y={y + 23}>
              {name}
            </text>
            <text
              x={584}
              y={y + 23}
              textAnchor="end"
              className={cx(
                'font-mono text-[11.5px] font-semibold transition-[fill] duration-(--duration-ui)',
                statusText[serverValue],
              )}
            >
              {labels[serverValue]}
            </text>
          </g>
        );
      })}

      <text className="font-mono text-label font-medium fill-ev-text" x={48} y={236}>
        {state.event === null ? '' : format(labels.event, { event: state.event })}
      </text>
      <g className={cx('transition-opacity duration-300', !state.toast && 'opacity-0')}>
        <rect className="fill-bad" x={44} y={246} width={180} height={30} rx={8} />
        <text className="font-body text-meta font-medium fill-on-signal" x={56} y={265}>
          {state.toast}
        </text>
      </g>

      <line className={lane} x1={252} y1={120} x2={388} y2={120} />
      <text className={cap} x={320} y={102} textAnchor="middle">
        {labels.push}
      </text>
      <text className={cap} x={320} y={144} textAnchor="middle">
        {labels.websocket}
      </text>
      <line className={lane} x1={252} y1={210} x2={388} y2={210} />
      <text className={cap} x={320} y={192} textAnchor="middle">
        {labels.pull}
      </text>
      <text className={cap} x={320} y={234} textAnchor="middle">
        {labels.http}
      </text>

      <circle
        cx={266}
        cy={64}
        r={4.5}
        className={cx('transition-[fill] duration-300', socketUp ? 'fill-res' : 'fill-bad')}
      />
      <text className={cap} x={278} y={68}>
        {format(labels.socket, { status: labels[state.socket] })}
      </text>
    </g>
  );
}

function metrics(state: PushPullState): [Metric, Metric, Metric] {
  const { labels } = state;
  const inSync =
    state.loaded && state.ui.every((value, i) => value !== null && value === state.srv[i]);
  const sync: Metric = !state.loaded
    ? { value: labels.none }
    : inSync
      ? { value: labels.inSync, tone: 'good' }
      : { value: labels.stale, tone: 'bad' };
  return [
    sync,
    { value: labels[state.socket], tone: state.socket === 'down' ? 'bad' : 'good' },
    { value: state.badge === null ? labels.none : String(state.badge) },
  ];
}

export const pushPullScene: SceneDefinition<PushPullState> = {
  viewBox: '0 0 640 312',
  // The server is on the right: a push event travels from the server to the browser (right
  // to left), a pull request from the browser to the server.
  lanes: {
    push: { x1: 388, x2: 252, y: 120 },
    pull: { x1: 252, x2: 388, y: 210 },
  },
  Component: PushPullDrawing,
  metrics,
};
