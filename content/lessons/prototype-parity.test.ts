// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAllScenes } from '@/components/scenes/registry';
import { patchState, startStateOf } from '@/engine/state';
import type { AnyLesson } from '@/engine/types';
import { optimisticUi } from './optimistic-ui';
import { pushPullSync } from './push-pull-sync';

/**
 * M3 acceptance: both lessons match reference/prototype.html in text, step order and animation
 * behaviour. This test loads the prototype itself, reads its lesson objects, and compares every
 * piece of text, every frame time and packet, and the scene state after every frame, with the
 * ported lesson. Only the intended differences are mapped in the helpers below:
 *  - prototype `short` is the port's `shortTitle`, `learn` is `takeawayIndex`, `t` is `at`;
 *  - the prototype tone 'mut' is 'neutral';
 *  - the prototype's body is HTML paragraphs, the port's is an array of strings;
 *  - the prototype's scene state has short names; the port's has readable ones, and carries
 *    its labels in the state;
 *  - an accepted difference (D14): the prototype hides a time marker by setting its time to
 *    null and remembers where it stood in the page; the port keeps that position in the state
 *    and sets `uiShown` / `serverShown` to false. Both are compared as what is visible: a marker
 *    that is not shown counts as null.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Proto = Record<string, any>;

const html = readFileSync(join(__dirname, '..', '..', 'reference', 'prototype.html'), 'utf8');
const script = /<script>([\s\S]*)<\/script>/
  .exec(html)![1]!
  .replace(
    'var LESSONS=[L1,L2];',
    'var LESSONS=[L1,L2]; window.__proto={LESSONS:LESSONS,Scene1:Scene1,Scene2:Scene2};',
  );

function loadPrototype(): { lessons: Proto[]; scenes: Proto[]; close: () => void } {
  const dom = new JSDOM(html.replace(/<script>[\s\S]*<\/script>/, ''), {
    runScripts: 'outside-only',
  });
  // The page script starts timers and draws; closing the window straight away stops them.
  dom.window.eval(script);
  const proto = (dom.window as any).__proto as Proto;
  // Plain copies, so nothing depends on the closed window.
  const copy = JSON.parse(
    JSON.stringify({ lessons: proto.LESSONS.map((l: Proto) => ({ ...l, scene: undefined })) }),
  );
  const runners = [proto.Scene1, proto.Scene2];
  return { lessons: copy.lessons, scenes: runners, close: () => dom.window.close() };
}

const proto = loadPrototype();
const scenes = await loadAllScenes();

const paragraphs = (body: string[]) =>
  body
    .join('')
    .split('</p>')
    .map((p) => p.replace(/^<p>/, ''))
    .filter(Boolean);

const status = (s: { t: string; k: string }) => ({ text: s.t, kind: s.k === '' ? 'none' : s.k });

/** The prototype's scene-1 state, written in the port's field names. */
function portState1(s: Proto) {
  return {
    title: s.title,
    button: s.btn,
    buttonOn: s.btnOn,
    buttonPending: s.btnPend,
    value: s.val,
    status: status(s.status),
    snapshot: s.snapshot,
    toast: s.toast,
    serverKey: s.srvKey,
    serverValue: s.srvVal,
    serverNote: status(s.srvNote),
    uiAt: s.tUi,
    serverAt: s.tSrv,
    uiShown: s.tUi !== null,
    serverShown: s.tSrv !== null,
    metrics: s.m.map((v: string) => (v === 'yes' ? { value: v, tone: 'bad' } : { value: v })),
  };
}
const portState2 = (s: Proto) => ({
  ui: s.ui,
  srv: s.srv,
  badge: s.badge,
  toast: s.toast,
  socket: s.socket,
  refetch: s.refetch,
  loaded: s.loaded,
  event: s.event,
});
const toPortState = [portState1, portState2];

/**
 * What the port's state shows, in the prototype's terms: a time marker that is hidden is null,
 * wherever its position is kept (D14). The second scene has no markers.
 */
const asShown = [
  (state: Proto) => ({
    ...state,
    uiAt: state.uiShown ? state.uiAt : null,
    serverAt: state.serverShown ? state.serverAt : null,
  }),
  (state: Proto) => state,
];

/** The state fields a frame can change are compared; labels never change and are not. */
function without<T extends object>(state: T, ...keys: string[]) {
  return Object.fromEntries(Object.entries(state).filter(([k]) => !keys.includes(k)));
}

const ported: AnyLesson[] = [optimisticUi, pushPullSync];

describe.each([0, 1])('prototype lesson %i against the port', (index) => {
  const p = proto.lessons[index]!;
  const lesson = ported[index]!;
  const scene = scenes[lesson.sceneId]!;
  const convert = toPortState[index]!;
  const protoScene = proto.scenes[index]!;

  it('has the same header text, counts and takeaways', () => {
    expect(lesson.title).toBe(p.title);
    expect(lesson.summary).toBe(p.sub);
    expect(lesson.order).toBe(p.n);
    expect(`${lesson.minutes} min`).toBe(p.min);
    expect(lesson.level).toBe(p.level);
    expect(lesson.steps).toHaveLength(p.steps.length);
    expect(lesson.takeaways).toEqual(p.learn);
    expect(lesson.metricLabels.map((l: string) => l.toUpperCase())).toEqual(p.metricLabels);
  });

  it.each(Array.from({ length: [6, 7][index]! }, (_, i) => i))('step %i has the same text', (i) => {
    const ps = p.steps[i];
    const step = lesson.steps[i]!;
    expect(step.tag).toBe(ps.tag);
    expect(step.tone).toBe(ps.tone === 'mut' ? 'neutral' : ps.tone);
    expect(step.title).toBe(ps.title);
    expect(step.shortTitle).toBe(ps.short);
    expect(step.takeawayIndex).toBe(ps.learn);
    expect(step.body).toEqual(paragraphs(ps.body));
    expect(step.keyIdea).toBe(ps.idea);
    expect(step.code?.source).toBe(ps.code);
    expect(Boolean(step.summary)).toBe(Boolean(ps.overlay));
  });

  it.each(Array.from({ length: [6, 7][index]! }, (_, i) => i))(
    'step %i runs the same frames: times, packets, and the scene state after each',
    (i) => {
      const ps = p.steps[i];
      const step = lesson.steps[i]!;
      expect(step.frames).toHaveLength(ps.frames.length);

      // The state the step starts in, then after each frame, in both.
      let protoState = Object.assign(protoScene.base(), ps.base ?? {});
      let portState = startStateOf(lesson, step);
      const compare = (when: string) =>
        expect(asShown[index]!(without(portState, 'labels', 'docs')), when).toEqual(
          convert(protoState),
        );
      compare(`step ${i + 1} start`);

      ps.frames.forEach((pf: Proto, f: number) => {
        const frame = step.frames[f]!;
        expect(frame.at, `frame ${f + 1} time`).toBe(pf.t);
        expect(frame.packet, `frame ${f + 1} packet`).toEqual(
          pf.packet && {
            lane: pf.packet.lane,
            label: pf.packet.label,
            tone: pf.packet.tone,
            ...(pf.packet.dir && { dir: pf.packet.dir }),
            ...(pf.packet.lost && { lost: pf.packet.lost }),
          },
        );
        protoState = Object.assign({}, protoState, pf.set);
        portState = patchState(portState, frame.set);
        compare(`step ${i + 1} after frame ${f + 1}`);
      });
    },
  );

  it('shows the same metrics after every frame of every step', () => {
    p.steps.forEach((ps: Proto, i: number) => {
      const step = lesson.steps[i]!;
      let protoState = Object.assign(protoScene.base(), ps.base ?? {});
      let portState = startStateOf(lesson, step);
      const same = () => {
        const expected = protoScene.metrics(protoState).map(([value, cls]: [string, string]) => ({
          value,
          ...(cls ? { tone: cls } : {}),
        }));
        expect(scene.metrics(portState), `step ${i + 1}`).toEqual(expected);
      };
      same();
      ps.frames.forEach((pf: Proto, f: number) => {
        protoState = Object.assign({}, protoState, pf.set);
        portState = patchState(portState, step.frames[f]!.set);
        same();
      });
    });
  });

  it('has the same verdict table, row for row', () => {
    const dom = new JSDOM(html.replace(/<script>[\s\S]*<\/script>/, ''), {
      runScripts: 'outside-only',
    });
    dom.window.eval(
      script.replace("loadLesson((location.hash||'').slice(1)||LESSONS[0].id,false);", ''),
    );
    const svg = dom.window.document.createElement('div');
    svg.innerHTML = `<svg>${protoScene.build()}</svg>`;
    const g = svg.querySelector('#verdict')!;
    const title = g.querySelector('.scap')!.textContent;
    const rows = [...g.querySelectorAll('.va')].map((label, r) => ({
      label: label.textContent,
      verdict: g.querySelectorAll('.vb')[r]!.textContent,
      tone: g.querySelectorAll('.vpill')[r]!.getAttribute('class')!.includes('warn')
        ? 'warn'
        : 'ok',
    }));
    dom.window.close();
    const summary = lesson.steps.find((s) => s.summary)!.summary!;
    expect(summary.title).toBe(title);
    expect(summary.rows).toEqual(rows);
  });
});

it('closes the prototype window', () => proto.close());
