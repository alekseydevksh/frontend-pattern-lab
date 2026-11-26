import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { optimisticUi } from '@content/lessons/optimistic-ui';
import { optimisticUiScene, type OptimisticUiState } from './OptimisticUiScene';

const Scene = optimisticUiScene.Component;
const base = optimisticUi.baseState as OptimisticUiState;

function draw(state: OptimisticUiState) {
  return (
    <svg>
      <Scene state={state} />
    </svg>
  );
}

/** The marker group that holds a label: it carries the opacity and the position. */
function markerOf(label: string) {
  const group = screen.getByText(label).closest('g');
  if (!group) throw new Error(`no marker group for ${label}`);
  return group;
}

describe('time markers on the strip', () => {
  it('shows a marker where its time puts it', () => {
    render(draw({ ...base, uiAt: 400, uiShown: true }));
    const group = markerOf('UI changes · 400 ms');
    expect(group.style.opacity).toBe('1');
    expect(group.style.transform).toBe('translate(320px)');
  });

  it('hides a marker that is not shown but keeps where it stands and what it says', () => {
    const { rerender } = render(draw({ ...base, uiAt: 600, uiShown: true }));
    const shown = markerOf('UI changes · 600 ms').style.transform;
    rerender(draw({ ...base, uiAt: 600, uiShown: false }));
    const group = markerOf('UI changes · 600 ms');
    expect(group.style.opacity).toBe('0');
    expect(group.style.transform).toBe(shown);
  });

  it('waits at the left edge, with no text, before it has ever been placed', () => {
    render(draw({ ...base, uiAt: null, serverAt: null, uiShown: false, serverShown: false }));
    const hidden = document.querySelectorAll<SVGGElement>('g[style*="opacity: 0"]');
    expect(hidden.length).toBeGreaterThanOrEqual(2);
    for (const group of hidden) {
      expect(group.style.transform).toBe('translate(0px)');
      expect(group.querySelector('text')?.textContent).toBe('');
    }
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    const visible = { ...base, uiAt: 600, serverAt: 600, uiShown: true, serverShown: true };
    const fresh = render(draw(visible));
    const direct = fresh.container.innerHTML;
    fresh.unmount();
    const walked = render(draw({ ...base, uiAt: 100, serverAt: null, uiShown: true }));
    walked.rerender(draw({ ...base, uiAt: 100, uiShown: false }));
    walked.rerender(draw(visible));
    expect(walked.container.innerHTML).toBe(direct);
  });
});
