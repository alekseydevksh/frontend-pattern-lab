import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderingIsolation } from '@content/lessons/rendering-isolation';
import {
  renderedCount,
  renderingIsolationScene,
  stateHome,
  wastedCount,
  type IsolationState,
} from './RenderingIsolationScene';
import { drawScene, expectSamePicture, fadedText as faded } from './sceneTest';

const base = renderingIsolation.baseState;

/** Step 1 after a key press: the draft lives in App and the whole tree renders. */
const wholeTree: IsolationState = {
  ...base,
  change: { text: 'draft: "h"', tone: 'req' },
  marks: ['used', 'wasted', 'wasted', 'used', 'used', 'wasted', 'wasted'],
  renders: [1, 1, 1, 1, 1, 1, 1],
};
/** Step 2 after a key press: the draft lives in Form. */
const isolated: IsolationState = {
  ...wholeTree,
  owner: 2,
  marks: ['idle', 'idle', 'used', 'used', 'used', 'idle', 'idle'],
  renders: [0, 0, 1, 1, 1, 0, 0],
};

const draw = (state: IsolationState) => drawScene(renderingIsolationScene, state);

describe('the rendering isolation scene', () => {
  it('counts the components rendered, the wasted renders and where the state lives', () => {
    expect(renderedCount(base)).toBe(0);
    expect(wastedCount(base)).toBe(0);
    expect(stateHome(base)).toBe('App');

    expect(renderedCount(wholeTree)).toBe(7);
    expect(wastedCount(wholeTree)).toBe(4);
    expect(renderedCount(isolated)).toBe(3);
    expect(wastedCount(isolated)).toBe(0);
    expect(stateHome(isolated)).toBe('Form');

    // A memo boundary that skips is not a render.
    expect(
      renderedCount({
        ...base,
        marks: ['used', 'used', 'used', 'used', 'used', 'skipped', 'skipped'],
      }),
    ).toBe(5);

    // With no owner, the state lives in the context that holds it.
    const contexts = [
      { name: 'User', keys: 'user', readers: 'Form' },
      { name: 'Inbox', keys: 'unread', readers: 'Header' },
    ];
    expect(stateHome({ ...base, owner: null, contexts, contextHome: 1 })).toBe('Inbox');
  });

  it('computes the metrics and marks them from the state', () => {
    expect(renderingIsolationScene.metrics(base)).toEqual([
      { value: '—' },
      { value: '—' },
      { value: 'App' },
    ]);
    expect(renderingIsolationScene.metrics(wholeTree)).toEqual([
      { value: '7 of 7', tone: 'bad' },
      { value: '4', tone: 'bad' },
      { value: 'App', tone: 'bad' },
    ]);
    expect(renderingIsolationScene.metrics(isolated)).toEqual([
      { value: '3 of 7', tone: 'good' },
      { value: '0', tone: 'good' },
      { value: 'Form', tone: 'good' },
    ]);
  });

  it('says in a word what each component did, not only with a colour', () => {
    render(draw(wholeTree));
    expect(screen.getAllByText('RENDERED')).toHaveLength(3);
    expect(screen.getAllByText('WASTED')).toHaveLength(4);
    expect(screen.getAllByText('×1')).toHaveLength(7);
    expect(screen.getByText('state: draft')).toBeTruthy();
    expect(screen.getByText('draft: "h"')).toBeTruthy();
  });

  it('draws no mark before the first change, and a skipped mark for a memo boundary', () => {
    const { rerender } = render(draw(base));
    expect(screen.queryByText('RENDERED')).toBeNull();
    expect(screen.getAllByText('×0')).toHaveLength(7);
    expect(screen.getByText('nothing changed yet')).toBeTruthy();
    expect(faded('memo')).toBe(true);

    rerender(
      draw({
        ...base,
        memo: 'stable',
        marks: ['used', 'used', 'used', 'used', 'used', 'skipped', 'skipped'],
      }),
    );
    expect(faded('memo')).toBe(false);
    expect(screen.getAllByText('SKIPPED')).toHaveLength(2);
    expect(screen.getAllByText('RENDERED')).toHaveLength(5);
  });

  it('draws the contexts with their readers, and the bracket notes from the state', () => {
    const { rerender } = render(draw(base));
    expect(faded('CONTEXT')).toBe(true);
    rerender(
      draw({
        ...base,
        owner: null,
        stateName: 'unread',
        contexts: [
          { name: 'User', keys: 'user', readers: 'Form, Messages' },
          { name: 'Inbox', keys: 'unread', readers: 'Header' },
        ],
        contextHome: 1,
        notes: [{ from: 0, to: 0, title: 'NEEDS UNREAD', note: 'its only reader', tone: 'req' }],
      }),
    );
    expect(faded('CONTEXT')).toBe(false);
    expect(screen.getByText('read by Form, Messages')).toBeTruthy();
    expect(screen.getByText('read by Header')).toBeTruthy();
    // The chip moves from the tree to the context that holds the state.
    expect(screen.getAllByText('state: unread')).toHaveLength(1);
    expect(screen.getByText('NEEDS UNREAD')).toBeTruthy();
    expect(screen.getByText('its only reader')).toBeTruthy();
  });

  it('shows the contain boundary only for a contained section', () => {
    const { rerender } = render(draw(base));
    expect(faded('contain')).toBe(true);
    rerender(draw({ ...base, contained: true }));
    expect(faded('contain')).toBe(false);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    const target: IsolationState = { ...isolated, memo: 'leaky', contained: true };
    expectSamePicture(renderingIsolationScene, target, [
      base,
      wholeTree,
      { ...wholeTree, memo: 'stable' },
    ]);
  });
});
