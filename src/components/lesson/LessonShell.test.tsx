import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { optimisticUi } from '@content/lessons/optimistic-ui';
import { pushPullSync } from '@content/lessons/push-pull-sync';
import { LessonHeader } from './LessonHeader';
import { LessonShell } from './LessonShell';

/**
 * The shell with the real lessons, in jsdom: the first step, the keys, the takeaways, and the
 * verdict table on the last step. Time is faked, so a frame runs when the test says.
 */
function mount(lesson = optimisticUi) {
  return render(
    <LessonShell lesson={lesson} header={<LessonHeader lesson={lesson} lessonCount={2} />} />,
  );
}

const key = (k: string) => act(() => void fireEvent.keyDown(document, { key: k }));
const heading = () => screen.getByRole('heading', { level: 2 }).textContent;

afterEach(() => {
  vi.useRealTimers();
});

describe('LessonShell', () => {
  it('shows the lesson header, the first step and the start state of the scene', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Optimistic UI');
    expect(screen.getByText('01. Data and state / Lesson 1 of 2')).toBeTruthy();
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

  it('throws a clear message for a lesson whose scene is not registered', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<LessonShell lesson={{ ...optimisticUi, sceneId: 'missing' }} header={null} />),
    ).toThrow(/no scene "missing"/);
    error.mockRestore();
  });
});
