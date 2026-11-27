'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

/**
 * Scene for lesson 6, State Ownership: the state of one offers page, as eight item chips. At the
 * top, one global store, where every item starts in a pile; in the middle, five homes (server,
 * client UI, URL, persistent, real-time) that the items sort into, each with the guarantees it
 * keeps and the tool that keeps them; at the bottom, the path one update takes, station by station,
 * with an arrow for every hop (above the stations when it goes forward, below in red when it goes
 * back).
 *
 * State is never colour alone: a home with nothing in it says "empty", a station says in a word
 * whether the update reached it, whether its copy is out of sync, or whether it is one of two
 * owners; the store says it has no single owner while it holds anything.
 *
 * Pure: the same state always draws the same SVG. A chip's place is computed from its home, so
 * moving an item is one patch, and the chip slides there with a CSS transition (none with reduced
 * motion). The layout of the store, the homes and the stations is a constant of the drawing; every
 * word on screen comes from the state, which comes from the lesson data.
 */

/** One value per state item, in the order the lesson lists them (also their place in the pile). */
export type PerItem<T> = [T, T, T, T, T, T, T, T];
/** One value per home: server, client UI, URL, persistent, real-time. */
export type PerBin<T> = [T, T, T, T, T];

export type BinTone = 'res' | 'req' | 'ev' | 'muted';

/**
 * What a station of the update path shows. `idle`: the update has not reached it; `done`: it has;
 * `drift`: its copy disagrees with another; `dup`: it is one of two owners of the same value.
 */
export type StationMark = 'idle' | 'done' | 'drift' | 'dup';

export interface Station {
  /** What the station is, written in capitals above its value: ACTION, HANDLER, URL... */
  role: string;
  value: string;
  mark: StationMark;
}

/** One hop of the update, between two stations. It goes back when `to` is before `from`. */
export interface Hop {
  from: number;
  to: number;
}

export interface OwnershipLabels {
  /** The note that the items and counts are made up. */
  illustrative: string;
  store: string;
  /** Shown beside the store's title while it holds any item. */
  storeNote: string;
  /** Shown in the store once every item has left it. */
  storeEmpty: string;
  bins: PerBin<string>;
  /** Shown in a home that holds no item. */
  empty: string;
  /** What each home must guarantee, in two short lines. */
  guarantees: PerBin<[string, string]>;
  /** The tool that keeps each home. */
  tools: PerBin<string>;
  path: string;
  noUpdate: string;
  done: string;
  drift: string;
  dup: string;
  /** Under a hop that goes back. */
  back: string;
  /** The "state kinds" metric. Template: `{n}`, `{total}`. */
  kindsOf: string;
  /** The "update path length" metric, for one hop and for more. Template: `{n}`. */
  hop: string;
  hops: string;
  none: string;
}

export interface OwnershipState {
  labels: OwnershipLabels;
  /** What each chip says. A frame may change one, as the filter's value changes. */
  items: PerItem<string>;
  /** The home of each item, or `null` while it sits in the global store. */
  home: PerItem<number | null>;
  /** The item the last update changed, outlined in orange. */
  hot: number | null;
  /** How many homes, from the first, show their guarantees. */
  noted: number;
  /** How many homes, from the first, show their tool. */
  tooled: number;
  /** The stations of the update path: four, or none before an update. */
  stations: Station[];
  /** The hops the update has taken so far, in order. */
  trail: Hop[];
}

const BINS = 5;
const BIN_TONES: PerBin<BinTone> = ['res', 'req', 'req', 'muted', 'ev'];

const STORE = { y: 28, h: 96 } as const;
const BIN = { y: 136, h: 152, w: 112, gap: 12 } as const;
const PATH = { y: 300, h: 156 } as const;
const CHIP = { w: 96, h: 24 } as const;
const binX = (i: number) => 16 + i * (BIN.w + BIN.gap);
/** Where an item waits in the pile: two rows of four. */
const pileSlot = (i: number) => ({ x: 56 + (i % 4) * 144, y: 62 + Math.floor(i / 4) * 30 });
/** Where an item sits in its home: one of two slots under the title. */
const binSlot = (bin: number, slot: number) => ({ x: binX(bin) + 8, y: BIN.y + 28 + slot * 28 });

const STATION = { y: 360, h: 52, w: 112, step: 152 } as const;
const stationX = (i: number) => 32 + i * STATION.step;
const centre = (i: number) => stationX(i) + STATION.w / 2;
/** Forward hops run above the stations, backward hops below them. */
const FWD_Y = 350;
const BACK_Y = 434;

const cap = 'font-mono text-label tracking-caps-wide';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const small = 'font-mono text-micro fill-muted-text';
const note = 'font-body text-micro fill-muted-text';
const ease = 'transition-[stroke,fill,opacity] duration-(--duration-ui)';

const toneStroke = {
  req: 'stroke-req',
  res: 'stroke-res',
  ev: 'stroke-ev',
  muted: 'stroke-muted',
} as const;
const toneText = {
  req: 'fill-req-text',
  res: 'fill-res-text',
  ev: 'fill-ev-text',
  muted: 'fill-muted-text',
} as const;

/** How many of the five homes hold at least one item. */
export function kindsInUse(s: OwnershipState): number {
  return new Set(s.home.filter((h): h is number => h !== null)).size;
}

/** How many items have no home of their own: they sit in the global store. */
export function unownedCount(s: OwnershipState): number {
  return s.home.filter((h) => h === null).length;
}

/**
 * How many hops the update has taken, and whether the path is in trouble: a hop went back, or a
 * station holds a copy that is out of sync or has a second owner.
 */
export function pathLength(s: OwnershipState): { hops: number; troubled: boolean } {
  return {
    hops: s.trail.length,
    troubled:
      s.trail.some((h) => h.to < h.from) ||
      s.stations.some((st) => st.mark === 'drift' || st.mark === 'dup'),
  };
}

/** Where an item's chip sits: its slot in its home, or its place in the pile. */
function chipPlace(s: OwnershipState, i: number) {
  const home = s.home[i] ?? null;
  if (home === null) return pileSlot(i);
  const slot = s.home.slice(0, i).filter((h) => h === home).length;
  return binSlot(home, slot);
}

function Chip({ s, i }: { s: OwnershipState; i: number }) {
  const { x, y } = chipPlace(s, i);
  const home = s.home[i] ?? null;
  const hot = s.hot === i;
  return (
    <g
      style={{ transform: `translate(${x}px, ${y}px)` }}
      className="transition-transform duration-(--duration-ui) ease-out"
      data-home={home ?? 'store'}
    >
      <rect
        width={CHIP.w}
        height={CHIP.h}
        rx={6}
        className={cx(
          ease,
          'fill-paper',
          hot
            ? 'stroke-req stroke-2'
            : home === null
              ? 'stroke-line stroke-[1.5]'
              : cx(toneStroke[BIN_TONES[home]!], 'stroke-[1.5]'),
        )}
      />
      <text x={10} y={16.5} className="font-mono text-[12px] font-semibold fill-ink">
        {s.items[i]}
      </text>
    </g>
  );
}

function Bin({ s, i }: { s: OwnershipState; i: number }) {
  const { labels } = s;
  const x = binX(i);
  const tone = BIN_TONES[i]!;
  const used = s.home.includes(i);
  const [line1, line2] = labels.guarantees[i]!;
  return (
    <g>
      <rect
        x={x}
        y={BIN.y}
        width={BIN.w}
        height={BIN.h}
        rx={12}
        strokeDasharray={used ? undefined : '4 3'}
        className={cx(ease, 'fill-panel stroke-[1.5]', used ? toneStroke[tone] : 'stroke-line')}
      />
      <text x={x + 10} y={BIN.y + 18} className={cx(cap, 'font-semibold', toneText[tone])}>
        {labels.bins[i]}
      </text>
      <text
        x={x + BIN.w / 2}
        y={BIN.y + 58}
        textAnchor="middle"
        className={cx(ease, note, used && 'opacity-0')}
      >
        {labels.empty}
      </text>
      <g className={cx(ease, s.noted <= i && 'opacity-0')}>
        <text x={x + 10} y={BIN.y + 100} className="font-body text-micro fill-ink">
          {line1}
        </text>
        <text x={x + 10} y={BIN.y + 114} className="font-body text-micro fill-ink">
          {line2}
        </text>
      </g>
      <g className={cx(ease, s.tooled <= i && 'opacity-0')}>
        <rect
          x={x + 8}
          y={BIN.y + 124}
          width={CHIP.w}
          height={18}
          rx={5}
          className="fill-paper stroke-res stroke-[1.5]"
        />
        <text
          x={x + 14}
          y={BIN.y + 136.5}
          className="font-mono text-micro font-semibold fill-res-text"
        >
          {labels.tools[i]}
        </text>
      </g>
    </g>
  );
}

function StationBox({ s, i }: { s: OwnershipState; i: number }) {
  const { labels } = s;
  const station = s.stations[i]!;
  const x = stationX(i);
  const y = STATION.y;
  const bad = station.mark === 'drift' || station.mark === 'dup';
  const word = { idle: null, done: labels.done, drift: labels.drift, dup: labels.dup }[
    station.mark
  ];
  return (
    <g data-mark={station.mark}>
      <rect
        x={x}
        y={y}
        width={STATION.w}
        height={STATION.h}
        rx={8}
        className={cx(
          ease,
          'fill-paper',
          station.mark === 'idle' && 'stroke-line stroke-[1.5]',
          station.mark === 'done' && 'stroke-req stroke-2',
          bad && 'stroke-bad stroke-2',
        )}
      />
      <text x={x + 10} y={y + 15} className={cx(small, 'tracking-caps')}>
        {station.role}
      </text>
      <text x={x + 10} y={y + 32} className="font-mono text-[12px] font-semibold fill-ink">
        {station.value}
      </text>
      {word !== null && (
        <text
          x={x + 10}
          y={y + 46}
          className={cx(
            'font-mono text-micro font-semibold tracking-caps',
            bad ? 'fill-bad-text' : 'fill-req-text',
          )}
        >
          {word}
        </text>
      )}
    </g>
  );
}

/** A hop's arrow: over the stations when it goes forward, under them, dashed and red, when back. */
function HopArrow({ hop, label }: { hop: Hop; label: string }) {
  const back = hop.to < hop.from;
  if (!back) {
    const x1 = centre(hop.from) + 10;
    const x2 = centre(hop.to) - 10;
    return (
      <g>
        <path
          d={`M${x1} ${STATION.y}V${FWD_Y}H${x2}V${STATION.y - 5}`}
          className="fill-none stroke-req stroke-[1.5]"
        />
        <path
          d={`M${x2 - 4} ${STATION.y - 6}L${x2 + 4} ${STATION.y - 6}L${x2} ${STATION.y}Z`}
          className="fill-req"
        />
      </g>
    );
  }
  const bottom = STATION.y + STATION.h;
  const x1 = centre(hop.from) - 10;
  const x2 = centre(hop.to) + 10;
  return (
    <g>
      <path
        d={`M${x1} ${bottom}V${BACK_Y}H${x2}V${bottom + 5}`}
        strokeDasharray="5 4"
        className="fill-none stroke-bad stroke-[1.5]"
      />
      <path
        d={`M${x2 - 4} ${bottom + 6}L${x2 + 4} ${bottom + 6}L${x2} ${bottom}Z`}
        className="fill-bad"
      />
      <text
        x={(x1 + x2) / 2}
        y={BACK_Y + 15}
        textAnchor="middle"
        className="font-mono text-micro font-semibold fill-bad-text"
      >
        {label}
      </text>
    </g>
  );
}

function OwnershipDrawing({ state: s }: { state: OwnershipState }) {
  const { labels } = s;
  const unowned = unownedCount(s);
  const pathShown = s.stations.length > 0;

  return (
    <g>
      <text className={small} x={624} y={16} textAnchor="end">
        {labels.illustrative}
      </text>

      {/* The global store, where every item starts. */}
      <rect className={panel} x={16} y={STORE.y} width={608} height={STORE.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={STORE.y + 22}>
        {labels.store}
      </text>
      <text
        x={608}
        y={STORE.y + 22}
        textAnchor="end"
        className={cx(
          ease,
          'font-mono text-micro font-semibold tracking-caps fill-bad-text',
          unowned === 0 && 'opacity-0',
        )}
      >
        {labels.storeNote}
      </text>
      <text
        x={320}
        y={STORE.y + 60}
        textAnchor="middle"
        className={cx(ease, note, unowned > 0 && 'opacity-0')}
      >
        {labels.storeEmpty}
      </text>

      {/* The five homes. */}
      {Array.from({ length: BINS }, (_, i) => (
        <Bin key={i} s={s} i={i} />
      ))}

      {/* The path of one update. */}
      <rect className={panel} x={16} y={PATH.y} width={608} height={PATH.h} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={PATH.y + 22}>
        {labels.path}
      </text>
      {pathShown ? (
        <g>
          {s.trail.map((hop, i) => (
            <HopArrow key={i} hop={hop} label={labels.back} />
          ))}
          {s.stations.map((_, i) => (
            <StationBox key={i} s={s} i={i} />
          ))}
        </g>
      ) : (
        <text x={320} y={STATION.y + 28} textAnchor="middle" className={note}>
          {labels.noUpdate}
        </text>
      )}

      {/* The items last, so a chip moving from the store to its home passes over both. */}
      {s.items.map((_, i) => (
        <Chip key={i} s={s} i={i} />
      ))}
    </g>
  );
}

function metrics(s: OwnershipState): [Metric, Metric, Metric] {
  const { labels } = s;
  const unowned = unownedCount(s);
  const sorted: Metric['tone'] = unowned === 0 ? 'good' : 'bad';
  const { hops, troubled } = pathLength(s);
  return [
    { value: format(labels.kindsOf, { n: kindsInUse(s), total: BINS }), tone: sorted },
    { value: String(unowned), tone: sorted },
    hops === 0
      ? { value: labels.none }
      : {
          value: format(hops === 1 ? labels.hop : labels.hops, { n: hops }),
          tone: troubled ? 'bad' : 'good',
        },
  ];
}

/** A lane for each hop between neighbouring stations: forward above them, back below them. */
const lanes = Object.fromEntries(
  [0, 1, 2].flatMap((i) => [
    [`fwd${i}`, { x1: centre(i) + 10, x2: centre(i + 1) - 10, y: FWD_Y }],
    [`back${i}`, { x1: centre(i) + 10, x2: centre(i + 1) - 10, y: BACK_Y }],
  ]),
);

export const stateOwnershipScene: SceneDefinition<OwnershipState> = {
  viewBox: '0 0 640 464',
  // `fwdN` runs from station N to N + 1; `backN` is used with `dir: 'back'`, from N + 1 to N.
  lanes,
  Component: OwnershipDrawing,
  metrics,
};
