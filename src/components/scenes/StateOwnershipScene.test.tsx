import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { stateOwnership } from '@content/lessons/state-ownership';
import {
  kindsInUse,
  pathLength,
  stateOwnershipScene,
  unownedCount,
  type OwnershipState,
  type PerItem,
  type Station,
} from './StateOwnershipScene';

const Scene = stateOwnershipScene.Component;
const base = stateOwnership.baseState;

/** Every item in its home: offers, filter, modal, theme, job, profile, draft, sort. */
const homes: PerItem<number | null> = [0, 2, 1, 3, 4, 0, 1, 2];
const sorted: OwnershipState = { ...base, home: homes };

const stations = (marks: Station['mark'][]): Station[] =>
  ['ACTION', 'STORE', 'URL', 'UI'].map((role, i) => ({
    role,
    value: `value ${i}`,
    mark: marks[i]!,
  }));

/** Step 1's end: everything in the store, and an update that looped back once. */
const looped: OwnershipState = {
  ...base,
  stations: stations(['done', 'dup', 'dup', 'done']),
  trail: [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 1 },
    { from: 2, to: 3 },
  ],
};
/** Step 5's end: every item in its home, and an update that went one way. */
const oneWay: OwnershipState = {
  ...sorted,
  noted: 5,
  tooled: 5,
  stations: stations(['done', 'done', 'done', 'done']),
  trail: [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
  ],
};

function draw(state: OwnershipState) {
  return (
    <svg>
      <Scene state={state} />
    </svg>
  );
}

/** Whether the element a piece of text sits in, or its group, is faded out. */
const faded = (text: string) => {
  const el = screen.getByText(text);
  return el.classList.contains('opacity-0') || el.closest('g')!.classList.contains('opacity-0');
};

/** The markup with each element's attributes in a fixed order, so equal pictures compare equal. */
function canonical(node: Element): string {
  const attrs = [...node.attributes]
    .map((a) => `${a.name}="${a.value}"`)
    .sort()
    .join(' ');
  const inner = [...node.childNodes]
    .map((child) => (child instanceof Element ? canonical(child) : child.textContent))
    .join('');
  return `<${node.tagName} ${attrs}>${inner}</${node.tagName}>`;
}

describe('the state ownership scene', () => {
  it('counts the homes in use, the unowned items and the hops', () => {
    expect(kindsInUse(base)).toBe(0);
    expect(unownedCount(base)).toBe(8);
    expect(pathLength(base)).toEqual({ hops: 0, loops: false });

    expect(kindsInUse({ ...base, home: [0, null, null, null, null, 0, null, null] })).toBe(1);
    expect(unownedCount({ ...base, home: [0, null, null, null, null, 0, null, null] })).toBe(6);

    expect(kindsInUse(sorted)).toBe(5);
    expect(unownedCount(sorted)).toBe(0);
    expect(pathLength(looped)).toEqual({ hops: 4, loops: true });
    expect(pathLength(oneWay)).toEqual({ hops: 3, loops: false });
  });

  it('computes the metrics and marks them from the state', () => {
    expect(stateOwnershipScene.metrics(base)).toEqual([
      { value: '0 of 5', tone: 'bad' },
      { value: '8', tone: 'bad' },
      { value: '—' },
    ]);
    expect(stateOwnershipScene.metrics(looped)).toEqual([
      { value: '0 of 5', tone: 'bad' },
      { value: '8', tone: 'bad' },
      { value: '4 hops', tone: 'bad' },
    ]);
    expect(stateOwnershipScene.metrics(oneWay)).toEqual([
      { value: '5 of 5', tone: 'good' },
      { value: '0', tone: 'good' },
      { value: '3 hops', tone: 'good' },
    ]);
  });

  it('keeps every metric value within seven characters', () => {
    for (const step of stateOwnership.steps) {
      for (const metric of stateOwnershipScene.metrics({ ...base, ...step.startState })) {
        expect(metric.value.length).toBeLessThanOrEqual(7);
      }
    }
  });

  it('says in words that the store has no owner and the homes are empty', () => {
    const { rerender } = render(draw(base));
    expect(faded('NO SINGLE OWNER')).toBe(false);
    expect(faded('empty: every item has one home')).toBe(true);
    expect(screen.getAllByText('empty').filter((t) => !isFaded(t))).toHaveLength(5);
    expect(screen.getByText('no update yet')).toBeTruthy();

    rerender(draw(sorted));
    expect(faded('NO SINGLE OWNER')).toBe(true);
    expect(faded('empty: every item has one home')).toBe(false);
    expect(screen.getAllByText('empty').filter((t) => !isFaded(t))).toHaveLength(0);
  });

  it('places each chip in its home, or in the pile while it has none', () => {
    const { container, rerender } = render(draw(base));
    const chipHomes = () =>
      [...container.querySelectorAll('[data-home]')].map((g) => g.getAttribute('data-home'));
    expect(chipHomes()).toEqual(Array(8).fill('store'));
    rerender(draw(sorted));
    expect(chipHomes()).toEqual(homes.map(String));
    // Two items in one home sit in two different slots.
    const offers = screen.getByText('offers').closest('g')!.getAttribute('style');
    const profile = screen.getByText('profile').closest('g')!.getAttribute('style');
    expect(offers).not.toBe(profile);
  });

  it('shows the guarantees and the tools home by home', () => {
    const { rerender } = render(draw({ ...sorted, noted: 2, tooled: 1 }));
    expect(faded('cached, refetched')).toBe(false);
    expect(faded('instant')).toBe(false);
    expect(faded('shareable link')).toBe(true);
    expect(faded('request cache')).toBe(false);
    expect(faded('component')).toBe(true);
    rerender(draw({ ...sorted, noted: 5, tooled: 5 }));
    expect(faded('resumes on drop')).toBe(false);
    expect(faded('subscription')).toBe(false);
  });

  it('marks each station with a word, and draws a backward hop with a note', () => {
    const { rerender } = render(draw(looped));
    expect(screen.getAllByText('TWO OWNERS')).toHaveLength(2);
    expect(screen.getAllByText('REACHED')).toHaveLength(2);
    expect(screen.getAllByText('copies back')).toHaveLength(1);
    expect(screen.queryByText('no update yet')).toBeNull();

    rerender(draw({ ...looped, stations: stations(['done', 'drift', 'drift', 'idle']) }));
    expect(screen.getAllByText('OUT OF SYNC')).toHaveLength(2);

    rerender(draw(oneWay));
    expect(screen.getAllByText('REACHED')).toHaveLength(4);
    expect(screen.queryByText('copies back')).toBeNull();
  });

  it('defines a forward and a backward lane between each pair of stations', () => {
    expect(Object.keys(stateOwnershipScene.lanes).sort()).toEqual([
      'back0',
      'back1',
      'back2',
      'fwd0',
      'fwd1',
      'fwd2',
    ]);
    const { fwd1, back1 } = stateOwnershipScene.lanes;
    expect(back1!.x1).toBe(fwd1!.x1);
    expect(back1!.y).toBeGreaterThan(fwd1!.y);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    const target: OwnershipState = { ...oneWay, hot: 1 };
    const fresh = render(draw(target));
    const direct = canonical(fresh.container);
    fresh.unmount();
    const walked = render(draw(base));
    walked.rerender(draw(looped));
    walked.rerender(draw(sorted));
    walked.rerender(draw(target));
    expect(canonical(walked.container)).toBe(direct);
  });
});

/** Whether an element itself is faded out. */
function isFaded(el: HTMLElement) {
  return el.classList.contains('opacity-0');
}
