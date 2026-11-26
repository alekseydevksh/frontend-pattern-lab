import { act } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROGRESS_STORAGE_KEY, progressFor, saveStep, serializeProgress } from './progress';
import { useProgress } from './useProgress';

const lesson = {
  slug: 'demo',
  takeaways: ['a', 'b'],
  steps: [{ takeawayIndex: 0 }, { takeawayIndex: 1 }],
};

function Probe() {
  const saved = progressFor(useProgress(), lesson);
  return <p>{saved ? `step ${saved.step + 1}` : 'nothing saved'}</p>;
}

describe('useProgress', () => {
  let container: HTMLElement;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.body.appendChild(document.createElement('div'));
  });
  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders as the server does, then applies saved progress after hydration', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      serializeProgress({ demo: { step: 1, ticked: [0, 1], completed: true } }),
    );
    // The server has no storage: this is the HTML the visitor receives.
    const serverHtml = renderToString(<Probe />);
    expect(serverHtml).toContain('nothing saved');
    container.innerHTML = serverHtml;

    const problems = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <Probe />, { onRecoverableError: problems });
    });

    expect(problems).not.toHaveBeenCalled(); // no hydration mismatch
    expect(error).not.toHaveBeenCalled();
    expect(container.textContent).toBe('step 2'); // and the saved value is applied
    await act(async () => root.unmount());
  });

  it('follows a step saved while it is on the page', async () => {
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    expect(container.textContent).toBe('nothing saved');
    await act(async () => saveStep(lesson, 1));
    expect(container.textContent).toBe('step 2');
    await act(async () => root.unmount());
  });

  it('renders without saved progress when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    expect(container.textContent).toBe('nothing saved');
    await act(async () => root.unmount());
  });
});
