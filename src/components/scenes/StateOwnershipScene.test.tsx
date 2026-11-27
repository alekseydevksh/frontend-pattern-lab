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
import { drawScene, expectSamePicture, fadedText as faded, isFaded } from './sceneTest';

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

const draw = (state: OwnershipState) => drawScene(stateOwnershipScene, state);

describe('the state ownership scene', () => {
  it('counts the homes in use, the unowned items and the hops', () => {
    expect(kindsInUse(base)).toBe(0);
    expect(unownedCount(base)).toBe(8);
    expect(pathLength(base)).toEqual({ hops: 0, troubled: false });

    expect(kindsInUse({ ...base, home: [0, null, null, null, null, 0, null, null] })).toBe(1);
    expect(unownedCount({ ...base, home: [0, null, null, null, null, 0, null, null] })).toBe(6);

    expect(kindsInUse(sorted)).toBe(5);
    expect(unownedCount(sorted)).toBe(0);
    expect(pathLength(looped)).toEqual({ hops: 4, troubled: true });
    expect(pathLength(oneWay)).toEqual({ hops: 3, troubled: false });
    // One hop forward, but the copies already disagree.
    const drifting: OwnershipState = {
      ...base,
      stations: stations(['done', 'drift', 'drift', 'idle']),
      trail: [{ from: 0, to: 1 }],
    };
    expect(pathLength(drifting)).toEqual({ hops: 1, troubled: true });
    expect(stateOwnershipScene.metrics(drifting)[2]).toEqual({ value: '1 hop', tone: 'bad' });
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
    expectSamePicture(stateOwnershipScene, target, [base, looped, sorted]);
  });
});
