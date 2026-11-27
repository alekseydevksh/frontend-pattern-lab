import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { requirementsFirst } from '@content/lessons/requirements-first';
import { patchState, startStateOf } from '@/engine/state';
import {
  chipsWidth,
  editCounts,
  requirementsScene,
  unclearOwners,
  type Band,
  type Part,
  type Requirement,
  type RequirementsState,
} from './RequirementsScene';
import { drawScene, expectSamePicture } from './sceneTest';

const base = requirementsFirst.baseState;
const draw = (state: RequirementsState) => drawScene(requirementsScene, state);

const card = (
  text: string,
  owner: string | null,
  kind: Requirement['kind'] = 0,
  mark: Requirement['mark'] = 'idle',
): Requirement => ({ kind, text, owner, mark });
const part = (name: string, edit = false): Part => ({ name, edit });
const band = (title: string, ...parts: Part[]): Band => ({ title, role: `${title} role`, parts });

const owned: RequirementsState = {
  ...base,
  cards: [card('List the offers', 'OfferList'), card('Works by keyboard alone', 'Button', 1)],
  bands: [band('PAGE', part('OffersPage')), band('FEATURE', part('OfferList'), part('Button'))],
};
const unowned: RequirementsState = {
  ...owned,
  cards: [card('List the offers', null), card('Works by keyboard alone', 'Button', 1)],
};
const edited: RequirementsState = {
  ...owned,
  cards: [...owned.cards, card('Offers can be paused', 'StatusBadge', 0, 'new')],
  bands: [band('DOMAIN', part('StatusBadge', true), part('OfferCard'))],
  note: '1 of 2 parts to edit',
  noteTone: 'good',
};

/** Every state a lesson step passes through, from its start to its last frame. */
const states = requirementsFirst.steps.flatMap((step) => {
  let state = startStateOf(requirementsFirst, step);
  return [state, ...step.frames.map((f) => (state = patchState(state, f.set)))];
});

describe('the requirements scene', () => {
  it('counts the cards with no clear owner and the parts to edit', () => {
    expect(unclearOwners(base)).toBe(0);
    expect(unclearOwners(owned)).toBe(0);
    expect(unclearOwners(unowned)).toBe(1);
    expect(editCounts(owned)).toEqual({ edit: 0, total: 3 });
    expect(editCounts(edited)).toEqual({ edit: 1, total: 2 });
  });

  it('computes the metrics from the state, and marks the owners good or bad', () => {
    expect(requirementsScene.metrics(base)).toEqual([
      { value: '0' },
      { value: '0' },
      { value: '0' },
    ]);
    expect(requirementsScene.metrics(unowned)).toEqual([
      { value: '2' },
      { value: '2' },
      { value: '1', tone: 'bad' },
    ]);
    expect(requirementsScene.metrics(owned)).toEqual([
      { value: '2' },
      { value: '2' },
      { value: '0', tone: 'good' },
    ]);
  });

  it('says in words what each card is and who owns it', () => {
    render(draw(edited));
    expect(screen.getAllByText('FUNCTIONAL')).toHaveLength(2);
    expect(screen.getAllByText('NON-FUNCTIONAL')).toHaveLength(1);
    expect(screen.getByText('owner: OfferList')).toBeTruthy();
    expect(screen.getByText('owner: StatusBadge')).toBeTruthy();
    expect(screen.queryByText('no clear owner')).toBeNull();
    expect(screen.getAllByText('NEW')).toHaveLength(1);
  });

  it('writes "no clear owner" for a card nobody owns', () => {
    render(draw(unowned));
    expect(screen.getAllByText('no clear owner')).toHaveLength(1);
    expect(screen.queryByText('NEW')).toBeNull();
  });

  it('marks a part to edit with the word as well as the outline, and says how many', () => {
    const { container } = render(draw(edited));
    expect(screen.getAllByText('EDIT')).toHaveLength(1);
    expect(screen.getByText('1 of 2 parts to edit')).toBeTruthy();
    const marks = [...container.querySelectorAll('[data-edit]')].map((g) => [
      g.textContent,
      g.getAttribute('data-edit'),
    ]);
    expect(marks).toEqual([
      ['StatusBadgeEDIT', 'yes'],
      ['OfferCard', 'no'],
    ]);
  });

  it('shows the empty notes, and the aside only while there are no bands', () => {
    const asideState: RequirementsState = {
      ...base,
      aside: [{ title: 'A BLOCK', lines: ['first line', 'second line'], tone: 'req' }],
    };
    const { rerender } = render(draw(asideState));
    expect(screen.getByText('no requirements yet')).toBeTruthy();
    expect(screen.getByText('A BLOCK')).toBeTruthy();
    expect(screen.getByText('second line')).toBeTruthy();
    rerender(draw({ ...asideState, bands: owned.bands, cards: owned.cards }));
    expect(screen.queryByText('A BLOCK')).toBeNull();
    expect(screen.queryByText('no requirements yet')).toBeNull();
    expect(screen.getByText('PAGE')).toBeTruthy();
  });

  it('defines the lane the new requirement travels along, from the last card to the structure', () => {
    expect(Object.keys(requirementsScene.lanes)).toEqual(['change']);
    const { x1, x2 } = requirementsScene.lanes.change!;
    expect(x1).toBeLessThan(x2);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    expectSamePicture(requirementsScene, edited, [unowned, owned, base]);
  });
});

describe('the requirements lesson fits the drawing', () => {
  it('keeps every card text within its card, and every aside line within its block', () => {
    for (const s of states) {
      for (const c of s.cards) {
        // 12 px mono: about 7.2 px a character, in 212 px.
        expect(c.text.length, c.text).toBeLessThanOrEqual(29);
        expect(c.owner === null || `owner: ${c.owner}`.length <= 30, c.owner ?? '').toBe(true);
      }
      for (const block of s.aside) {
        expect(block.title.length, block.title).toBeLessThanOrEqual(30);
        for (const line of block.lines) expect(line.length, line).toBeLessThanOrEqual(46);
      }
      expect(s.cards.length).toBeLessThanOrEqual(7);
      expect(s.bands.length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the chips of every band within the band, and each band title and role apart', () => {
    for (const s of states) {
      for (const b of s.bands) {
        expect(chipsWidth(b.parts, s.labels.edit), b.title).toBeLessThanOrEqual(288);
        expect(b.title.length, b.title).toBeLessThanOrEqual(12);
        expect(b.role.length, b.role).toBeLessThanOrEqual(34);
      }
    }
  });

  it('names every owner as a part of the structure drawn with it', () => {
    for (const s of states) {
      const names = new Set(s.bands.flatMap((b) => b.parts.map((p) => p.name)));
      if (names.size === 0) continue;
      for (const c of s.cards) {
        if (c.owner !== null) expect(names, `${c.text} → ${c.owner}`).toContain(c.owner);
      }
    }
  });
});
