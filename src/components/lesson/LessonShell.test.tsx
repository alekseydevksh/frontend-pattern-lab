import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { optimisticUi } from '@content/lessons/optimistic-ui';
import { pushPullSync } from '@content/lessons/push-pull-sync';
import { optimisticUiScene } from '@/components/scenes/OptimisticUiScene';
import { pushPullScene } from '@/components/scenes/PushPullScene';
import type { AnyLesson } from '@/engine/types';
import { LessonHeader } from './LessonHeader';
import { LessonShell } from './LessonShell';

/**
 * The shell with the real lessons, in jsdom: the first step, the keys, the takeaways, and the
 * verdict table on the last step. Time is faked, so a frame runs when the test says.
 */
const sceneOf = (lesson: AnyLesson) =>
  lesson === pushPullSync ? pushPullScene : optimisticUiScene;

function mount(
  lesson: AnyLesson = optimisticUi,
  nextLesson?: { title: string; onOpen: () => void },
) {
  return render(
    <LessonShell
      lesson={lesson}
      scene={sceneOf(lesson)}
      header={<LessonHeader lesson={lesson} lessonCount={12} />}
      nextLesson={nextLesson}
    />,
  );
}

const key = (k: string) => act(() => void fireEvent.keyDown(document, { key: k }));
const heading = () => screen.getByRole('heading', { level: 2 }).textContent;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LessonShell', () => {
  it('shows the lesson header, the first step and the start state of the scene', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Optimistic UI');
    expect(screen.getByText('01. Data and state / Lesson 1 of 12')).toBeTruthy();
    expect(screen.getByText('4 min')).toBeTruthy();
    expect(screen.getByText('6 steps')).toBeTruthy();
    expect(heading()).toBe('Waiting makes a tap feel broken');
    const diagram = screen.getByRole('img');
    expect(diagram.getAttribute('aria-label')).toMatch(/^A browser panel with a Like button/);
    expect(within(diagram).getByText('Like')).toBeTruthy();
    expect(screen.getByText('UI changes at')).toBeTruthy();
  });

  it('steps with the arrow keys and ticks the takeaways as steps are reached', () => {
    mount();
    const reached = () =>
      screen
        .getAllByRole('listitem')
        .filter((li) => li.getAttribute('data-reached') === 'true')
        .map((li) => li.textContent?.split(' — ')[0]);
    expect(reached()).toEqual(['Why waiting for the server makes small actions feel slow']);

    key('ArrowRight');
    expect(heading()).toBe('Update first, ask later');
    expect(reached()).toHaveLength(2);

    key('ArrowRight');
    key('ArrowRight');
    key('ArrowRight');
    expect(heading()).toBe('Not every action can bet');
    expect(reached()).toHaveLength(4);

    // Going back does not untick what was reached.
    key('ArrowLeft');
    key('ArrowLeft');
    key('ArrowLeft');
    key('ArrowLeft');
    expect(heading()).toBe('Waiting makes a tap feel broken');
    expect(reached()).toHaveLength(4);
  });

  it('runs the frames of a step on the clock', () => {
    vi.useFakeTimers();
    mount();
    const diagram = () => screen.getByRole('img');
    expect(within(diagram()).queryByText('Waiting for server…')).toBeNull();
    act(() => void vi.advanceTimersByTime(300));
    expect(within(diagram()).getByText('Waiting for server…')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(1800));
    expect(within(diagram()).getByText('Saved')).toBeTruthy();
    expect(screen.getAllByText('600 ms').length).toBeGreaterThan(0);
  });

  it('replaces the diagram with the verdict table on the last step', () => {
    mount();
    key('ArrowRight');
    key('ArrowRight');
    key('ArrowRight');
    key('ArrowRight');
    expect(screen.getByRole('img')).toBeTruthy();
    key('ArrowRight');
    expect(heading()).toBe('A quick test');
    expect(screen.queryByRole('img')).toBeNull();
    const table = screen.getByRole('table', { name: 'IS IT SAFE TO UPDATE FIRST?' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByText('Sign a document')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restart lesson ↺' })).toBeTruthy();

    // Back to a diagram step: the table goes, the image is back.
    key('ArrowLeft');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('restarts the lesson from the last step with the Next button', () => {
    mount();
    for (let i = 0; i < 5; i += 1) key('ArrowRight');
    fireEvent.click(screen.getByRole('button', { name: 'Restart lesson ↺' }));
    expect(heading()).toBe('Waiting makes a tap feel broken');
  });

  it('plays the second lesson too, with its metrics from the scene', () => {
    vi.useFakeTimers();
    mount(pushPullSync);
    expect(screen.getByText('Client vs server')).toBeTruthy();
    // Step 1 starts before the first load: nothing is known yet.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText('in sync')).toBeTruthy();
    key('ArrowRight');
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByText('stale')).toBeTruthy();
  });

  it('keeps the room of the verdict table under every diagram, hidden from everything but the layout', () => {
    const { container } = mount();
    const copy = container.querySelector('[data-table-sizer]')!;
    expect(copy.getAttribute('aria-hidden')).toBe('true');
    expect(copy.hasAttribute('inert')).toBe(true);
    expect(copy.className).toContain('invisible');
    expect(copy.querySelector('table')).not.toBeNull();
    // Nothing can reach it: the page still has one diagram and no table.
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the real table, and no copy of it, on the summary step', () => {
    const { container } = mount();
    for (let i = 0; i < 5; i += 1) key('ArrowRight');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(container.querySelector('[data-table-sizer]')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says Simulated next to the metrics, outside the diagram', () => {
    mount();
    const pill = screen.getByText('Simulated');
    expect(within(screen.getByRole('img')).queryByText('Simulated')).toBeNull();
    expect(pill.closest('[role="img"]')).toBeNull();
  });
});

describe('LessonShell: the next lesson', () => {
  const toLast = () => {
    for (let i = 0; i < 5; i += 1) key('ArrowRight');
  };

  it('offers the next lesson on the last step, in the button and on the right arrow', () => {
    const onOpen = vi.fn();
    mount(optimisticUi, { title: 'Push + Pull Sync', onOpen });
    expect(screen.getByRole('button', { name: 'Next: Update first →' })).toBeTruthy();
    toLast();
    expect(onOpen).not.toHaveBeenCalled(); // arriving at the last step is not leaving it
    expect(screen.queryByRole('button', { name: /Restart/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next lesson: Push + Pull Sync →' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    key('ArrowRight');
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(heading()).toBe('A quick test');
  });

  it('keeps Restart lesson, and does nothing on the arrow, when there is no next lesson', () => {
    mount();
    toLast();
    key('ArrowRight');
    expect(heading()).toBe('A quick test');
    expect(screen.getByRole('button', { name: 'Restart lesson ↺' })).toBeTruthy();
  });
});

describe('LessonShell: the ?step= address', () => {
  it('opens at the step in the address and writes the clamped step back', () => {
    window.history.replaceState(null, '', '/lessons/optimistic-ui/?step=99');
    mount();
    expect(heading()).toBe('A quick test');
    expect(window.location.search).toBe('?step=6');
  });

  it('opens at the first step for a value that is not a number, and cleans the address', () => {
    window.history.replaceState(null, '', '/lessons/optimistic-ui/?step=abc');
    mount();
    expect(heading()).toBe('Waiting makes a tap feel broken');
    expect(window.location.search).toBe('');
  });

  it('follows the player, without adding history entries', () => {
    window.history.replaceState(null, '', '/lessons/optimistic-ui/');
    const entries = window.history.length;
    mount();
    key('ArrowRight');
    key('ArrowRight');
    expect(window.location.search).toBe('?step=3');
    key('ArrowLeft');
    key('ArrowLeft');
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(entries);
  });
});

describe('LessonShell: saved progress', () => {
  const saved = () => JSON.parse(localStorage.getItem('pl-progress') ?? 'null');

  it('saves the furthest step and the takeaways it ticks', () => {
    mount();
    key('ArrowRight');
    key('ArrowRight');
    key('ArrowLeft');
    expect(saved().lessons['optimistic-ui']).toEqual({
      step: 2,
      ticked: [0, 1, 2],
      completed: false,
    });
  });

  it('completes the lesson on the last step', () => {
    mount();
    for (let i = 0; i < 5; i += 1) key('ArrowRight');
    expect(saved().lessons['optimistic-ui'].completed).toBe(true);
  });

  it('shows takeaways ticked on an earlier visit', () => {
    localStorage.setItem(
      'pl-progress',
      JSON.stringify({
        v: 1,
        lessons: { 'optimistic-ui': { step: 5, ticked: [0, 1, 2, 3], completed: true } },
      }),
    );
    mount();
    const reached = screen
      .getAllByRole('listitem')
      .filter((li) => li.getAttribute('data-reached') === 'true');
    expect(reached).toHaveLength(4);
    expect(heading()).toBe('Waiting makes a tap feel broken'); // progress does not move the player
  });

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mount();
    key('ArrowRight');
    expect(heading()).toBe('Update first, ask later');
    expect(
      screen.getAllByRole('listitem').filter((li) => li.getAttribute('data-reached') === 'true'),
    ).toHaveLength(2);
    vi.restoreAllMocks();
  });
});
