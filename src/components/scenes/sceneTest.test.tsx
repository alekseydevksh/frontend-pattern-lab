import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { SceneDefinition } from '@/engine/types';
import { canonical, drawScene, expectSamePicture, fadedText } from './sceneTest';

interface S {
  word: string;
  hidden?: boolean;
}

/** A pure scene. */
const pure: SceneDefinition<S> = {
  viewBox: '0 0 10 10',
  lanes: { a: { x1: 0, x2: 1, y: 0 } },
  Component: ({ state }) => (
    <g className={state.hidden ? 'opacity-0' : undefined}>
      <text>{state.word}</text>
    </g>
  ),
  metrics: () => [{ value: '1' }, { value: '2' }, { value: '3' }],
};

/** A scene that remembers the words it has drawn: the picture depends on its history. */
const seen: string[] = [];
const leaky: SceneDefinition<S> = {
  ...pure,
  Component: ({ state }) => {
    seen.push(state.word);
    return <text>{seen.join('+')}</text>;
  },
};

describe('the scene test helpers', () => {
  it('compares pictures by their attributes, not by the order they were added in', () => {
    const a = document.createElement('div');
    a.innerHTML = '<p class="x" id="y">z</p>';
    const b = document.createElement('div');
    b.innerHTML = '<p id="y" class="x">z</p>';
    expect(a.innerHTML).not.toBe(b.innerHTML);
    expect(canonical(a)).toBe(canonical(b));
    b.innerHTML = '<p id="y" class="x">other</p>';
    expect(canonical(a)).not.toBe(canonical(b));
  });

  it('finds out whether text, or a group around it, is faded out', () => {
    const { rerender } = render(drawScene(pure, { word: 'hello' }));
    expect(fadedText('hello')).toBe(false);
    rerender(drawScene(pure, { word: 'hello', hidden: true }));
    expect(fadedText('hello')).toBe(true);
  });

  it('passes a pure scene', () => {
    expectSamePicture(pure, { word: 'c' }, [{ word: 'a' }, { word: 'b', hidden: true }]);
  });

  it('fails a scene whose picture depends on where it has been', () => {
    seen.length = 0;
    expect(() => expectSamePicture(leaky, { word: 'c' }, [{ word: 'a' }, { word: 'b' }])).toThrow();
  });

  it('fails when it is given nothing to detour through, so it cannot pass for nothing', () => {
    expect(() => expectSamePicture(pure, { word: 'c' }, [])).toThrow(/at least one state/);
  });
});
