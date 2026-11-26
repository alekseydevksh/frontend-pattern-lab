import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { virtualization } from '@content/lessons/virtualization';
import { mountedRows, virtualizationScene, type VirtualizationState } from './VirtualizationScene';

const Scene = virtualizationScene.Component;
const base = virtualization.baseState;

function draw(state: VirtualizationState) {
  return (
    <svg>
      <Scene state={state} />
    </svg>
  );
}

/** The opacity class of the group a piece of text sits in: hidden groups carry `opacity-0`. */
const hidden = (text: string) =>
  screen.getByText(text).closest('g')!.classList.contains('opacity-0');

/**
 * The markup with each element's attributes in a fixed order. React appends an attribute that is
 * added on an update (a dash pattern, say), so the same picture can list attributes differently.
 */
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

describe('the virtualization scene', () => {
  it('mounts every fetched row, or only the eight slots of a window', () => {
    expect(mountedRows({ ...base, mounted: 'all', loaded: 10_000 })).toBe(10_000);
    expect(mountedRows({ ...base, mounted: 'window', loaded: 10_000 })).toBe(8);
    // A window near the end of a short list holds only the rows that exist.
    expect(mountedRows({ ...base, mounted: 'window', loaded: 1203, first: 1199 })).toBe(5);
    expect(mountedRows({ ...base, loaded: 0 })).toBe(0);
  });

  it('draws eight rows at most, whatever the list holds', () => {
    render(draw({ ...base, mounted: 'all', loaded: 10_000 }));
    expect(screen.getAllByText(/^Row \d/)).toHaveLength(8);
    expect(screen.getByText('Row 1,199')).toBeTruthy();
    expect(screen.getByText('Row 1,206')).toBeTruthy();
    expect(screen.getByText('1,198 rows')).toBeTruthy(); // the block above
    expect(screen.getByText('8,794 rows')).toBeTruthy(); // the block below
  });

  it('sizes the spacers from the rows they replace', () => {
    render(draw({ ...base, mounted: 'window', spacers: true }));
    expect(screen.getByText('1,198 rows · 47,920 px')).toBeTruthy();
    expect(screen.getByText('8,794 rows · 351,760 px')).toBeTruthy();
  });

  it('says so when a window has no spacers', () => {
    render(draw({ ...base, mounted: 'window', spacers: false }));
    expect(screen.getAllByText('NO SPACER')).toHaveLength(2);
  });

  it('computes the metrics from the state, with the render cost from the lesson', () => {
    const all = virtualizationScene.metrics({ ...base, cost: { value: '900 ms', tone: 'bad' } });
    expect(all).toEqual([
      { value: '10,000' },
      { value: '60,000', tone: 'bad' },
      { value: '900 ms', tone: 'bad' },
    ]);
    const window = virtualizationScene.metrics({ ...base, mounted: 'window' });
    expect(window[1]).toEqual({ value: '48', tone: 'good' });
    // A short list, all mounted, is not marked either way.
    expect(virtualizationScene.metrics({ ...base, loaded: 50, first: 39 })[1]).toEqual({
      value: '300',
    });
    expect(virtualizationScene.metrics({ ...base, loaded: 0 }).slice(0, 2)).toEqual([
      { value: '—' },
      { value: '—' },
    ]);
  });

  it('lights the containment chip and the cost chips from the state', () => {
    const { rerender } = render(draw(base));
    expect(hidden('content-visibility: auto')).toBe(true);
    expect(hidden('Row heights')).toBe(true);
    rerender(draw({ ...base, contain: true, costs: 2 }));
    expect(hidden('content-visibility: auto')).toBe(false);
    expect(hidden('Row heights')).toBe(false);
    expect(hidden('Focus')).toBe(false);
    expect(hidden('Find in page')).toBe(true);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    const target = { ...base, mounted: 'window' as const, spacers: true, costs: 3 };
    const fresh = render(draw(target));
    const direct = canonical(fresh.container);
    fresh.unmount();
    const walked = render(draw({ ...base, loaded: 0 }));
    walked.rerender(draw({ ...base, contain: true }));
    walked.rerender(draw(target));
    expect(canonical(walked.container)).toBe(direct);
  });
});
