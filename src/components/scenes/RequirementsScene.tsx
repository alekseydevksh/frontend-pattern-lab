'use client';
// A client module, so the lesson page can hand this scene to the player (D16).

import type { Metric, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';
import {
  MICRO_CHAR,
  cap,
  ease,
  note,
  panel,
  small,
  toneStroke,
  toneText,
  type ToneKey,
} from '@/components/scenes/sceneKit';

/**
 * Scene for lesson 7, Requirements First and Component Boundaries: the requirements of one offers
 * screen as cards on the left, and the structure that has to own them on the right. The structure
 * is a stack of bands, each holding named parts; before there is one, the right side holds short
 * text blocks instead. Every card says who owns it, or that nobody clearly does, and a part that a
 * change forces to be edited says so in a word.
 *
 * State is never colour alone: a card carries the word FUNCTIONAL or NON-FUNCTIONAL, an owner line
 * that says "no clear owner" in words, and NEW while it is the requirement that just arrived; a
 * part that must change carries the word EDIT as well as a red outline; the closing note says how
 * many parts change.
 *
 * Pure: the same state always draws the same SVG. Positions are constants of the drawing and
 * every word on screen comes from the state, which comes from the lesson data. Only the style
 * strings, the tone maps and the character-width maths of `sceneKit` are used, not its
 * components: a lesson page loads one scene, so a shared component would add bytes to the page (D20).
 */

/** 0 for a functional requirement, 1 for a non-functional one. */
export type RequirementKind = 0 | 1;

export interface Requirement {
  kind: RequirementKind;
  text: string;
  /** The name of the one part that owns it, or `null` when no part clearly does. */
  owner: string | null;
  /** `new` for the requirement that has just arrived. */
  mark: 'idle' | 'new';
}

/** A named part of the structure. `edit`: the change that just arrived forces it to be edited. */
export interface Part {
  name: string;
  edit: boolean;
}

/** One band of the structure: a layer, with what it is for and the parts in it. */
export interface Band {
  title: string;
  role: string;
  parts: Part[];
}

/** A short text block shown on the right before there is a structure. */
export interface Aside {
  title: string;
  lines: string[];
  tone: 'req' | 'ev' | 'muted';
}

export interface RequirementsLabels {
  /** The note that the screen, its requirements and its parts are made up. */
  illustrative: string;
  requirements: string;
  /** The word on a functional card and on a non-functional one. */
  kinds: [string, string];
  /** Shown while there is no card. */
  noRequirements: string;
  /** The owner line of a card. Template: `{name}`. */
  owner: string;
  noOwner: string;
  /** On the card that has just arrived. */
  isNew: string;
  /** On a part that must be edited. */
  edit: string;
}

export interface RequirementsState {
  labels: RequirementsLabels;
  cards: Requirement[];
  /** The title of the right side: what kind of structure it shows. */
  heading: string;
  /** Text blocks, drawn while there are no bands. */
  aside: Aside[];
  bands: Band[];
  /** A closing line under the structure, such as how many parts must change. */
  note: string;
  noteTone: 'bad' | 'good' | 'muted';
}

const CARDS = { x: 28, y: 64, w: 232, h: 46, pitch: 52 } as const;
const cardY = (i: number) => CARDS.y + i * CARDS.pitch;
const BANDS = { x: 300, y: 64, w: 312, h: 62, pitch: 72 } as const;
const bandY = (i: number) => BANDS.y + i * BANDS.pitch;
/** Where a chip starts in a band, and how far it may run. */
const CHIPS = { x: 312, w: 288, h: 24, gap: 8 } as const;
const ASIDE = { x: 300, w: 312, gap: 10 } as const;

const noteTone = { bad: 'bad', good: 'res', muted: 'muted' } as const satisfies Record<
  RequirementsState['noteTone'],
  ToneKey
>;
const kindTone = ['req', 'ev'] as const satisfies readonly ToneKey[];

/**
 * The width of a chip around `text` in the micro mono size. Written out here and not imported from
 * `sceneKit`: a function that two lesson pages share is put in a chunk of its own, which costs each
 * of those pages about 0.4 KB (D20, D21), and a constant does not.
 */
const microWidth = (text: string, padding: number) => text.length * MICRO_CHAR + padding;

/** How many cards have no clear owner. */
export function unclearOwners(s: RequirementsState): number {
  return s.cards.filter((c) => c.owner === null).length;
}

/** How many parts must be edited, and how many parts there are. */
export function editCounts(s: RequirementsState): { edit: number; total: number } {
  const parts = s.bands.flatMap((b) => b.parts);
  return { edit: parts.filter((p) => p.edit).length, total: parts.length };
}

/** The width of a part's chip: its name, the EDIT word when it has one, and some padding. */
export function chipWidth(part: Part, editWord: string): number {
  return microWidth(part.name, 12) + (part.edit ? microWidth(editWord, 0) + 6 : 0);
}

/** The width a band's chips take together. It must fit `CHIPS.w`. */
export function chipsWidth(parts: Part[], editWord: string): number {
  return (
    parts.reduce((sum, part) => sum + chipWidth(part, editWord), 0) +
    Math.max(0, parts.length - 1) * CHIPS.gap
  );
}

/** The height of an aside block: its title, its lines and some padding. */
const asideHeight = (a: Aside) => 30 + a.lines.length * 14;

function Card({ s, i }: { s: RequirementsState; i: number }) {
  const { labels } = s;
  const card = s.cards[i]!;
  const y = cardY(i);
  const tone = kindTone[card.kind];
  const isNew = card.mark === 'new';
  return (
    <g data-owner={card.owner ?? 'none'}>
      <rect
        x={CARDS.x}
        y={y}
        width={CARDS.w}
        height={CARDS.h}
        rx={8}
        className={cx(
          ease,
          'fill-paper',
          isNew ? 'stroke-req stroke-2' : 'stroke-line stroke-[1.5]',
        )}
      />
      <rect
        x={CARDS.x}
        y={y + 8}
        width={4}
        height={CARDS.h - 16}
        rx={2}
        className={card.kind === 0 ? 'fill-req' : 'fill-ev'}
      />
      <text
        x={CARDS.x + 14}
        y={y + 14}
        className={cx('font-mono text-micro font-semibold tracking-caps', toneText[tone])}
      >
        {labels.kinds[card.kind]}
      </text>
      {isNew && (
        <text
          x={CARDS.x + CARDS.w - 10}
          y={y + 14}
          textAnchor="end"
          className="font-mono text-micro font-semibold tracking-caps fill-req-text"
        >
          {labels.isNew}
        </text>
      )}
      <text x={CARDS.x + 14} y={y + 29} className="font-mono text-[12px] font-semibold fill-ink">
        {card.text}
      </text>
      <text
        x={CARDS.x + 14}
        y={y + 41}
        className={cx(
          'font-mono text-micro',
          card.owner === null ? 'font-semibold fill-bad-text' : 'fill-muted-text',
        )}
      >
        {card.owner === null ? labels.noOwner : format(labels.owner, { name: card.owner })}
      </text>
    </g>
  );
}

function BandBox({ s, i }: { s: RequirementsState; i: number }) {
  const band = s.bands[i]!;
  const y = bandY(i);
  /** Where each chip starts: the chips before it, and a gap after each. */
  const lefts = band.parts.map((_, j) =>
    band.parts
      .slice(0, j)
      .reduce<number>((x, p) => x + chipWidth(p, s.labels.edit) + CHIPS.gap, CHIPS.x),
  );
  return (
    <g>
      <rect
        x={BANDS.x}
        y={y}
        width={BANDS.w}
        height={BANDS.h}
        rx={10}
        className="fill-paper stroke-line stroke-[1.5]"
      />
      <text x={BANDS.x + 12} y={y + 17} className={cx(small, 'font-semibold tracking-caps')}>
        {band.title}
      </text>
      <text x={BANDS.x + BANDS.w - 12} y={y + 17} textAnchor="end" className={note}>
        {band.role}
      </text>
      {band.parts.map((part, j) => {
        const w = chipWidth(part, s.labels.edit);
        const left = lefts[j]!;
        return (
          <g key={part.name} data-edit={part.edit ? 'yes' : 'no'}>
            <rect
              x={left}
              y={y + 28}
              width={w}
              height={CHIPS.h}
              rx={6}
              className={cx(
                ease,
                'fill-panel',
                part.edit ? 'stroke-bad stroke-2' : 'stroke-line stroke-[1.5]',
              )}
            />
            <text x={left + 6} y={y + 44} className="font-mono text-micro font-semibold fill-ink">
              {part.name}
            </text>
            {part.edit && (
              <text
                x={left + 6 + part.name.length * MICRO_CHAR + 6}
                y={y + 44}
                className="font-mono text-micro font-semibold tracking-caps fill-bad-text"
              >
                {s.labels.edit}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function RequirementsDrawing({ state: s }: { state: RequirementsState }) {
  const { labels } = s;
  // Where the right side ends: the closing note sits under the bands, or under the text blocks.
  const asideEnd = s.aside.reduce((y, a) => y + asideHeight(a) + ASIDE.gap, 64);
  const noteY = (s.bands.length > 0 ? bandY(s.bands.length) : asideEnd) + 8;
  /** Where each text block starts: the blocks before it, and a gap after each. */
  const blockTops = s.aside.map((_, j) =>
    s.aside.slice(0, j).reduce((y, a) => y + asideHeight(a) + ASIDE.gap, 64),
  );
  return (
    <g>
      <text className={small} x={624} y={16} textAnchor="end">
        {labels.illustrative}
      </text>

      {/* The requirements. */}
      <rect className={panel} x={16} y={28} width={256} height={416} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={32} y={52}>
        {labels.requirements}
      </text>
      {s.cards.length === 0 && (
        <text x={144} y={cardY(0) + 24} textAnchor="middle" className={note}>
          {labels.noRequirements}
        </text>
      )}
      {s.cards.map((_, i) => (
        <Card key={i} s={s} i={i} />
      ))}

      {/* The structure that has to own them. */}
      <rect className={panel} x={288} y={28} width={336} height={416} rx={14} />
      <text className={cx(cap, 'fill-muted-text')} x={304} y={52}>
        {s.heading}
      </text>
      {s.bands.map((_, i) => (
        <BandBox key={i} s={s} i={i} />
      ))}
      {s.bands.length === 0 &&
        s.aside.map((block, i) => {
          const y = blockTops[i]!;
          return (
            <g key={i}>
              <rect
                x={ASIDE.x}
                y={y}
                width={ASIDE.w}
                height={asideHeight(block)}
                rx={10}
                className={cx(
                  ease,
                  'fill-paper stroke-[1.5]',
                  block.tone === 'muted' ? 'stroke-line' : toneStroke[block.tone],
                )}
                strokeDasharray={block.tone === 'muted' ? '4 3' : undefined}
              />
              <text
                x={ASIDE.x + 12}
                y={y + 18}
                className={cx(cap, 'font-semibold', toneText[block.tone])}
              >
                {block.title}
              </text>
              {block.lines.map((line, j) => (
                <text
                  key={j}
                  x={ASIDE.x + 12}
                  y={y + 34 + j * 14}
                  className="font-body text-micro fill-ink"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      {s.note !== '' && (
        <text
          x={BANDS.x + 4}
          y={noteY + 12}
          className={cx('font-mono text-[12px] font-semibold', toneText[noteTone[s.noteTone]])}
        >
          {s.note}
        </text>
      )}
    </g>
  );
}

function metrics(s: RequirementsState): [Metric, Metric, Metric] {
  const unclear = unclearOwners(s);
  const owners: Metric = { value: String(unclear) };
  if (s.cards.length > 0) owners.tone = unclear > 0 ? 'bad' : 'good';
  return [{ value: String(s.cards.length) }, { value: String(s.bands.length) }, owners];
}

export const requirementsScene: SceneDefinition<RequirementsState> = {
  viewBox: '0 0 640 460',
  // The new requirement travels from its card, the last in the list, to the structure.
  lanes: { change: { x1: 262, x2: 346, y: cardY(6) + CARDS.h / 2 } },
  Component: RequirementsDrawing,
  metrics,
};
