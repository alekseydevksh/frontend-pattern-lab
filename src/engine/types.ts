import type { ComponentType } from 'react';

/**
 * The data model of a lesson and the contract of a scene. See "Data model and lesson
 * engine" in docs/SPEC.md. Nothing in here knows about a particular lesson.
 */

/** The colour meaning of a packet: request, server answer, pushed event, failure. */
export type Tone = 'req' | 'res' | 'ev' | 'bad';

export type Track =
  'Data and state' | 'Rendering and performance' | 'Structure' | 'Product reliability';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Lesson<S> {
  slug: string;
  order: number;
  track: Track;
  title: string;
  summary: string;
  minutes: number;
  level: Level;
  /** Numbers of the article sections this lesson restates. */
  sourceSections: number[];
  /** Shown as a checklist, ticked as steps are reached. */
  takeaways: string[];
  metricLabels: [string, string, string];
  /** Key in the scene registry (src/components/scenes/registry.ts). */
  sceneId: string;
  /** The scene state every step starts from. */
  baseState: S;
  steps: Step<S>[];
}

/**
 * A row of the catalog. `Lesson` is only for lessons that can be played; a lesson that is not
 * ready has a catalog entry and no `Lesson`, so the catalog never needs fake steps. Entries are
 * listed in lesson order, so the position in the list is the lesson number. A `ready` entry
 * must have a playable lesson with the same slug (content/lessons/catalog.test.ts checks it).
 */
export interface CatalogEntry {
  slug: string;
  title: string;
  summary: string;
  track: Track;
  status: 'ready' | 'soon';
}

export interface Step<S> {
  id: string;
  /** PROBLEM, TECHNIQUE, FAILURE, SUMMARY, ... */
  tag: string;
  tone: Tone | 'neutral';
  title: string;
  /** Used by the "Next: ..." button. */
  shortTitle: string;
  /** Paragraphs, with inline code in backticks. */
  body: string[];
  keyIdea: string;
  code?: { language: 'ts' | 'tsx' | 'json'; source: string };
  /** Index into `Lesson.takeaways` that this step ticks. */
  takeawayIndex: number;
  /** Text alternative of the diagram at this step. */
  sceneAlt: string;
  /** Merged over `baseState` when the step starts. */
  startState?: Partial<S>;
  frames: Frame<S>[];
  /** Replaces the diagram with a verdict table. */
  summary?: SummaryTable;
}

export interface Frame<S> {
  /** Milliseconds from the start of the step. Frames must be sorted by this value. */
  at: number;
  /** Shallow patch: top-level fields are replaced whole, arrays included. */
  set?: Partial<S>;
  packet?: Packet;
}

export interface Packet {
  /** Name of a lane in the scene definition. */
  lane: string;
  /** `fwd` runs from the lane's x1 to its x2, `back` the other way. Default `fwd`. */
  dir?: 'fwd' | 'back';
  label: string;
  tone: Tone;
  /** Stops halfway and fades. */
  lost?: boolean;
}

export interface SummaryTable {
  title: string;
  rows: { label: string; verdict: string; tone: 'ok' | 'warn' }[];
}

/** A straight path in the scene's viewBox units along which packets travel. */
export interface Lane {
  x1: number;
  x2: number;
  y: number;
}

export interface Metric {
  value: string;
  tone?: 'good' | 'bad';
}

export interface SceneDefinition<S> {
  viewBox: string;
  lanes: Record<string, Lane>;
  /** Pure: the same state always draws the same SVG. Rendered inside the player's <svg>. */
  Component: ComponentType<{ state: S }>;
  metrics: (state: S) => [Metric, Metric, Metric];
}

/** A packet that is in flight, with its lane resolved from the scene definition. */
export interface ActivePacket {
  /** Unique per run of a step, so a replay mounts a fresh element. */
  key: string;
  packet: Packet;
  lane: Lane;
}

/*
 * Registries hold lessons and scenes with different state types side by side, so they use
 * the erased forms. The state type is checked where a lesson and its scene are written;
 * the content validation test checks that they were paired correctly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLesson = Lesson<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySceneDefinition = SceneDefinition<any>;
