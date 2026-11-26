import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { normalizedData } from '@content/lessons/normalized-data';
import {
  copyCount,
  normalizedDataScene,
  viewsInSync,
  writesNeeded,
  type NormalizedState,
} from './NormalizedDataScene';

const Scene = normalizedDataScene.Component;
const base = normalizedData.baseState;
const OLD = 'Mira Lund';
const NEW = 'Mira Vale';

const copies: NormalizedState = {
  ...base,
  names: [OLD, OLD, OLD],
  view: [OLD, OLD, OLD],
};
const entities: NormalizedState = {
  ...base,
  mode: 'entities',
  entity: OLD,
  view: [OLD, OLD, OLD],
};

function draw(state: NormalizedState) {
  return (
    <svg>
      <Scene state={state} />
    </svg>
  );
}

/** The opacity class of the group a piece of text sits in: hidden groups carry `opacity-0`. */
const hidden = (text: string) =>
  screen.getByText(text).closest('g')!.classList.contains('opacity-0');

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

describe('the normalized data scene', () => {
  it('counts the places that hold the user, writes still needed and views in sync', () => {
    expect(copyCount(base)).toBe(0);
    expect(copyCount(copies)).toBe(3);
    expect(copyCount(entities)).toBe(1);

    const renamedOne: NormalizedState = {
      ...copies,
      latest: NEW,
      names: [NEW, OLD, OLD],
      view: [NEW, OLD, OLD],
    };
    expect(writesNeeded(renamedOne)).toBe(2);
    expect(viewsInSync(renamedOne)).toBe(1);
    expect(writesNeeded({ ...copies, latest: NEW })).toBe(3);

    expect(writesNeeded({ ...entities, latest: NEW })).toBe(1);
    expect(writesNeeded({ ...entities, latest: NEW, entity: NEW })).toBe(0);
    expect(viewsInSync({ ...entities, latest: NEW, entity: NEW })).toBe(0);
  });

  it('computes the metrics and marks them from the state', () => {
    expect(normalizedDataScene.metrics(base)).toEqual([
      { value: '—' },
      { value: '—' },
      { value: '—' },
    ]);
    expect(normalizedDataScene.metrics(copies)).toEqual([
      { value: '3', tone: 'bad' },
      { value: '3 of 3' },
      { value: '0' },
    ]);
    expect(
      normalizedDataScene.metrics({ ...copies, latest: NEW, sent: true, names: [NEW, OLD, OLD] }),
    ).toEqual([
      { value: '3', tone: 'bad' },
      { value: '0 of 3', tone: 'bad' },
      { value: '2', tone: 'bad' },
    ]);
    expect(normalizedDataScene.metrics(entities)).toEqual([
      { value: '1', tone: 'good' },
      { value: '3 of 3', tone: 'good' },
      { value: '0' },
    ]);
    const done = {
      ...entities,
      latest: NEW,
      sent: true,
      entity: NEW,
      view: [NEW, NEW, NEW] as const,
    };
    expect(normalizedDataScene.metrics({ ...done, view: [...done.view] })).toEqual([
      { value: '1', tone: 'good' },
      { value: '3 of 3', tone: 'good' },
      { value: '0', tone: 'good' },
    ]);
  });

  it('draws a stale copy and a stale view with the word, not only a colour', () => {
    render(
      draw({
        ...copies,
        latest: NEW,
        sent: true,
        names: [NEW, OLD, OLD],
        view: [NEW, OLD, OLD],
      }),
    );
    // Two stale copies and two stale views.
    expect(screen.getAllByText('STALE')).toHaveLength(4);
    expect(screen.getAllByText('by Mira Lund')).toHaveLength(2);
    expect(screen.getByText('by Mira Vale')).toBeTruthy();
    expect(screen.getByText('user u1 renamed')).toBeTruthy();
  });

  it('draws one record and three references in the entity mode, and says when there is none', () => {
    const { rerender } = render(draw(copies));
    expect(hidden('USERS')).toBe(true);
    expect(hidden('NO SHARED RECORD')).toBe(false);
    expect(screen.getByText('no update yet')).toBeTruthy();
    rerender(draw(entities));
    expect(hidden('USERS')).toBe(false);
    expect(hidden('NO SHARED RECORD')).toBe(true);
    expect(screen.getAllByText('→ u1')).toHaveLength(3);
    expect(screen.getByText('3 references')).toBeTruthy();
    expect(screen.queryByText('STALE')).toBeNull();
  });

  it('lights the cache plan from the state', () => {
    const { rerender } = render(draw(entities));
    // The panel's title sits in a group of its own inside the group that fades.
    const panelHidden = () =>
      screen.getByText('CACHE PLAN').closest('g')!.parentElement!.classList.contains('opacity-0');
    expect(panelHidden()).toBe(true);
    rerender(draw({ ...entities, plan: 2 }));
    expect(panelHidden()).toBe(false);
    expect(hidden('Same id, same record')).toBe(false);
    expect(hidden('Merge every response')).toBe(false);
    expect(hidden('Refetch what drifts')).toBe(true);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    const target: NormalizedState = { ...entities, plan: 3, latest: NEW, sent: true };
    const fresh = render(draw(target));
    const direct = canonical(fresh.container);
    fresh.unmount();
    const walked = render(draw(base));
    walked.rerender(draw(copies));
    walked.rerender(draw({ ...copies, latest: NEW, sent: true }));
    walked.rerender(draw(target));
    expect(canonical(walked.container)).toBe(direct);
  });
});
