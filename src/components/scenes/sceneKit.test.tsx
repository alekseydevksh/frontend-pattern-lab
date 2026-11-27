import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  BoundaryLabel,
  Bracket,
  MICRO_CHAR,
  microWidth,
  PanelBox,
  StateChip,
  toneStroke,
  toneText,
  type ToneKey,
} from './sceneKit';

const tones: ToneKey[] = ['req', 'res', 'ev', 'bad', 'muted'];

describe('the shared scene module', () => {
  it('gives every tone a token stroke and a token text colour, and no raw colour', () => {
    for (const tone of tones) {
      expect(toneStroke[tone]).toMatch(/^stroke-[a-z]+$/);
      expect(toneText[tone]).toMatch(/^fill-[a-z]+(-text)?$/);
    }
    expect(Object.keys(toneStroke).sort()).toEqual([...tones].sort());
    expect(Object.keys(toneText).sort()).toEqual([...tones].sort());
  });

  it('sizes a chip to its text', () => {
    expect(microWidth('', 14)).toBe(14);
    expect(microWidth('abcd', 12)).toBe(4 * MICRO_CHAR + 12);
  });

  it('draws a bracket with its title and note beside the middle of the line', () => {
    const { container } = render(
      <svg>
        <Bracket x={100} y1={10} y2={50} title="TITLE" note="a note" tone="bad" />
      </svg>,
    );
    const line = container.querySelector('line')!;
    expect(line.getAttribute('x1')).toBe('100');
    expect(line.getAttribute('class')).toBe('stroke-bad');
    const [title, note] = [...container.querySelectorAll('text')];
    expect(title!.textContent).toBe('TITLE');
    expect(title!.getAttribute('x')).toBe('108');
    expect(title!.getAttribute('y')).toBe('28');
    expect(note!.textContent).toBe('a note');
    expect(note!.getAttribute('y')).toBe('43');
  });

  it('draws chips, a boundary label and a titled panel with their words', () => {
    const { container } = render(
      <svg>
        <StateChip x={20} top={40} text="state: x" />
        <StateChip x={200} top={40} text="state: x" alignRight />
        <BoundaryLabel x={5} y={5} text="memo" tone="res" />
        <PanelBox x={0} y={0} w={100} h={50} title="PANEL" />
      </svg>,
    );
    const rects = [...container.querySelectorAll('rect')];
    expect(rects[0]!.getAttribute('width')).toBe(String(microWidth('state: x', 14)));
    // Aligned right, the chip ends where `x` says.
    expect(
      Number(rects[1]!.getAttribute('x')) + Number(rects[1]!.getAttribute('width')),
    ).toBeCloseTo(200);
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toEqual([
      'state: x',
      'state: x',
      'memo',
      'PANEL',
    ]);
  });
});
