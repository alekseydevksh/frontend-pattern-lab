import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { containerViewViewmodel } from '@content/lessons/container-view-viewmodel';
import { patchState, startStateOf } from '@/engine/state';
import {
  chipsRowWidth,
  containerViewScene,
  logicCount,
  type LayersState,
} from './ContainerViewScene';
import { drawScene, expectSamePicture } from './sceneTest';

const base = containerViewViewmodel.baseState;
const draw = (state: LayersState) => drawScene(containerViewScene, state);

const tangled: LayersState = { ...base, tangled: true };
const loaded: LayersState = {
  ...base,
  calls: ['GET /offers/7'],
  request: 'ready',
  payload: [
    { name: 'title', value: '"A"' },
    { name: 'price_cents', value: '1999' },
  ],
};
const mapped: LayersState = { ...loaded, mapped: 5, logic: [], view: 'ready' };

/** Every state a lesson step passes through, from its start to its last frame. */
const states = containerViewViewmodel.steps.flatMap((step) => {
  let state = startStateOf(containerViewViewmodel, step);
  return [state, ...step.frames.map((f) => (state = patchState(state, f.set)))];
});

describe('the container, view and view model scene', () => {
  it('counts the decisions in the single component, or left in the view', () => {
    expect(logicCount(tangled)).toBe(4);
    expect(logicCount(base)).toBe(4);
    expect(logicCount({ ...base, logic: base.logic.slice(2) })).toBe(2);
    expect(logicCount(mapped)).toBe(0);
  });

  it('computes the metrics from the state', () => {
    expect(containerViewScene.metrics(base)).toEqual([
      { value: '0' },
      { value: '0' },
      { value: '4', tone: 'bad' },
    ]);
    expect(containerViewScene.metrics(loaded)[0]).toEqual({ value: '2' });
    expect(containerViewScene.metrics(mapped)).toEqual([
      { value: '2' },
      { value: '5' },
      { value: '0', tone: 'good' },
    ]);
  });

  it('tags each row of the single component with its job, in a word', () => {
    const { container } = render(draw(tangled));
    expect(screen.getByText('ONE COMPONENT · OfferPage')).toBeTruthy();
    expect(screen.getByText('fetches, decides, draws')).toBeTruthy();
    const jobs = [...container.querySelectorAll('[data-job]')].map((g) =>
      g.getAttribute('data-job'),
    );
    expect(jobs).toEqual(base.tangle.map((l) => l.job));
    expect(screen.getAllByText('FETCH')).toHaveLength(2);
    expect(screen.getAllByText('DECIDE')).toHaveLength(4);
    expect(screen.getAllByText('DRAW')).toHaveLength(2);
    // The three columns are not drawn while one component does everything.
    expect(screen.queryByText('CONTAINER')).toBeNull();
  });

  it('draws the three columns, with their roles, once the component is split', () => {
    render(draw(base));
    for (const word of ['CONTAINER', 'VIEW MODEL', 'VIEW'])
      expect(screen.getByText(word)).toBeTruthy();
    expect(screen.getByText('turns it into screen words')).toBeTruthy();
    expect(screen.queryByText('ONE COMPONENT · OfferPage')).toBeNull();
    expect(screen.getByText('request: idle')).toBeTruthy();
    expect(screen.getByText('nothing to draw yet')).toBeTruthy();
  });

  it('says the request state and the calls in words, and lists the payload', () => {
    const { rerender } = render(draw(loaded));
    expect(screen.getByText('request: ready')).toBeTruthy();
    expect(screen.getByText('GET /offers/7')).toBeTruthy();
    expect(screen.getByText('price_cents: 1999')).toBeTruthy();
    rerender(draw({ ...loaded, request: 'error' }));
    expect(screen.getByText('request: failed')).toBeTruthy();
    rerender(draw({ ...loaded, request: 'loading' }));
    expect(screen.getByText('request: loading')).toBeTruthy();
  });

  it('builds the model field by field, each with the backend field it comes from', () => {
    const { rerender } = render(draw({ ...loaded, mapped: 2 }));
    expect(screen.getByText('title: Spring sale')).toBeTruthy();
    expect(screen.getByText('price: $19.99')).toBeTruthy();
    expect(screen.getByText('from price_cents')).toBeTruthy();
    expect(screen.queryByText('status: Active')).toBeNull();
    expect(screen.getByText('left out: owner_id, region')).toBeTruthy();
    rerender(draw({ ...loaded, mapped: 5 }));
    expect(screen.getByText('actions: Edit · Pause')).toBeTruthy();
    expect(screen.getByText('from can_edit')).toBeTruthy();
    rerender(draw(loaded));
    expect(screen.queryByText('left out: owner_id, region')).toBeNull();
  });

  it('lists the decisions left in the view under a heading that says so', () => {
    const { rerender } = render(draw(base));
    expect(screen.getByText('LOGIC IN THE VIEW')).toBeTruthy();
    expect(screen.getByText('price_cents / 100')).toBeTruthy();
    rerender(draw(mapped));
    expect(screen.queryByText('LOGIC IN THE VIEW')).toBeNull();
  });

  it('draws the view as nothing, loading, an error with a way out, or the offer', () => {
    const { container, rerender } = render(draw(loaded));
    const kind = () => container.querySelector('[data-view]')!.getAttribute('data-view');
    expect(kind()).toBe('blank');
    rerender(draw({ ...mapped, view: 'loading' }));
    expect(kind()).toBe('loading');
    expect(screen.getByText('LOADING…')).toBeTruthy();
    rerender(draw({ ...mapped, view: 'error' }));
    expect(screen.getByText('COULD NOT LOAD')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    rerender(draw(mapped));
    expect(kind()).toBe('ready');
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('3 days left')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
  });

  it('defines the lanes along the top: to the backend, between the columns, and on to the view', () => {
    const { backend, pass, show } = containerViewScene.lanes;
    expect(Object.keys(containerViewScene.lanes).sort()).toEqual(['backend', 'pass', 'show']);
    expect(backend!.x2).toBeLessThanOrEqual(pass!.x1);
    expect(pass!.x2).toBeLessThanOrEqual(show!.x1);
  });

  it('draws the same picture for the same state, wherever it has been before', () => {
    expectSamePicture(containerViewScene, mapped, [tangled, base, loaded]);
  });
});

describe('the container, view and view model lesson fits the drawing', () => {
  it('keeps every line of code and every value within its box', () => {
    for (const s of states) {
      // 11.5 px mono: about 6.9 px a character. 576 px in the single component, 164 px in a column.
      for (const line of s.tangle) expect(line.text.length, line.text).toBeLessThanOrEqual(66);
      // 10.5 px mono: 6.3 px a character, 156 px in the view column.
      for (const line of s.logic) expect(line.text.length, line.text).toBeLessThanOrEqual(24);
      for (const f of s.payload) {
        expect(`${f.name}: ${f.value}`.length, f.name).toBeLessThanOrEqual(26);
      }
      expect(chipsRowWidth(s.payload.map((f) => f.name))).toBeLessThanOrEqual(576);
      expect(s.tangle.length).toBeLessThanOrEqual(8);
      expect(s.calls.length).toBeLessThanOrEqual(2);
      expect(s.model.actions.length).toBeLessThanOrEqual(2);
      expect(s.payload.length).toBeLessThanOrEqual(7);
    }
  });

  it('keeps the model rows within the view model column', () => {
    const { labels, model } = base;
    const rows = [model.title, model.price, model.status, model.expiry, model.actions.join(' · ')];
    for (const [i, value] of rows.entries()) {
      expect(
        `${labels.modelFields[i]}: ${value}`.length,
        labels.modelFields[i],
      ).toBeLessThanOrEqual(23);
    }
    expect(labels.leftOut.length).toBeLessThanOrEqual(28);
  });

  it('tells a consistent story at every state', () => {
    for (const s of states) {
      // The view draws the offer only once the view model has built all of it.
      if (s.view === 'ready') expect(s.mapped).toBe(5);
      // The view model builds from a payload the container holds.
      if (s.mapped > 0) expect(s.payload.length).toBeGreaterThan(0);
      // Once the view model builds a field, the view holds one decision fewer.
      if (!s.tangled) {
        expect(s.logic.length).toBeLessThanOrEqual(4);
        expect(s.logic.length).toBeLessThanOrEqual(Math.max(0, 4 - Math.max(0, s.mapped - 1)));
      }
    }
  });
});
