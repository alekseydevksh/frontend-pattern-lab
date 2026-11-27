import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from 'vitest';
import type { SceneDefinition } from '@/engine/types';

/**
 * Helpers for the unit test of a scene (`<Name>Scene.test.tsx`). Only tests import this module
 * (`boundaries.test.ts`, and a lint rule). A scene test keeps what is its own, the counts, the
 * metrics and the words a state draws, and uses these for the rest:
 *
 *   const Scene = fooScene.Component;
 *   const draw = (state: FooState) => drawScene(fooScene, state);
 *   it('draws the same picture ...', () => expectSamePicture(fooScene, target, [a, b, c]));
 */

/** A scene's drawing for a state, inside the `<svg>` the player would give it. */
export function drawScene<S>(scene: SceneDefinition<S>, state: S): ReactElement {
  const Scene = scene.Component;
  return (
    <svg>
      <Scene state={state} />
    </svg>
  );
}

/**
 * The markup with each element's attributes in a fixed order, so equal pictures compare equal.
 * React appends an attribute that is added on an update (a dash pattern, say), so the same picture
 * can list its attributes differently.
 */
export function canonical(node: Element): string {
  const attrs = [...node.attributes]
    .map((a) => `${a.name}="${a.value}"`)
    .sort()
    .join(' ');
  const inner = [...node.childNodes]
    .map((child) => (child instanceof Element ? canonical(child) : child.textContent))
    .join('');
  return `<${node.tagName} ${attrs}>${inner}</${node.tagName}>`;
}

/** Whether an element itself is faded out: scenes fade a thing with the `opacity-0` class. */
export const isFaded = (el: Element) => el.classList.contains('opacity-0');

/** Whether this piece of text, or any group around it, is faded out, so it is not on screen. */
export function fadedText(text: string): boolean {
  for (let el: Element | null = screen.getByText(text); el; el = el.parentElement) {
    if (isFaded(el)) return true;
  }
  return false;
}

/**
 * A scene draws from its state alone: the picture for `target` is the same when it is drawn fresh
 * and when the scene has been through other states first (`detours`, in order) and is then drawn
 * with `target`. Fails for a scene that keeps something between draws, or leaves a change behind.
 */
export function expectSamePicture<S>(
  scene: SceneDefinition<S>,
  target: NoInfer<S>,
  detours: NoInfer<S>[],
) {
  expect(detours.length, 'give at least one state to draw before the target').toBeGreaterThan(0);
  const fresh = render(drawScene(scene, target));
  const direct = canonical(fresh.container);
  fresh.unmount();
  const [first, ...rest] = detours as [S, ...S[]];
  const walked = render(drawScene(scene, first));
  for (const state of [...rest, target]) walked.rerender(drawScene(scene, state));
  expect(canonical(walked.container)).toBe(direct);
}
