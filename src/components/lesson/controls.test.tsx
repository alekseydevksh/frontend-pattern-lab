import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import messages from '@messages/en.json';
import { PlayerControls } from './PlayerControls';
import { StepControls } from './StepControls';

const titles = ['First idea', 'Second idea', 'Third idea'];

function steps(overrides: Partial<Parameters<typeof StepControls>[0]> = {}) {
  const handlers = { onGoTo: vi.fn(), onBack: vi.fn(), onNext: vi.fn() };
  render(
    <StepControls
      stepIndex={1}
      stepTitles={titles}
      nextTitle="Third"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('StepControls', () => {
  it('names the step counter and a button for every step, with its title', () => {
    steps();
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
    for (const [i, title] of titles.entries()) {
      expect(screen.getByRole('button', { name: `Step ${i + 1}: ${title}` })).toBeTruthy();
    }
  });

  it('marks only the current step with aria-current', () => {
    steps();
    const current = screen.getAllByRole('button').filter((b) => b.ariaCurrent === 'step');
    expect(current.map((b) => b.getAttribute('aria-label'))).toEqual(['Step 2: Second idea']);
  });

  it('jumps to a step when its button is pressed, the current one included', () => {
    const { onGoTo } = steps();
    fireEvent.click(screen.getByRole('button', { name: 'Step 3: Third idea' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step 2: Second idea' }));
    expect(onGoTo.mock.calls).toEqual([[2], [1]]);
  });

  it('shows what comes next on the Next button, and moves on when pressed', () => {
    const { onNext, onBack } = steps();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Third →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables Back on the first step only', () => {
    steps({ stepIndex: 0 });
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps Back enabled on the last step and offers a restart in place of Next', () => {
    const { onNext } = steps({ stepIndex: 2 });
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: messages.player.restart }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('takes the last-step label from the page, for "next lesson"', () => {
    steps({ stepIndex: 2, finalLabel: 'Next lesson: Push + Pull Sync →' });
    expect(screen.getByRole('button', { name: 'Next lesson: Push + Pull Sync →' })).toBeTruthy();
  });

  it('shows the keyboard hint', () => {
    steps();
    expect(screen.getByText('Space')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('uses native buttons, so Enter and Space work without extra code', () => {
    steps();
    for (const button of screen.getAllByRole('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
    }
  });
});

describe('PlayerControls', () => {
  function player(props: Partial<Parameters<typeof PlayerControls>[0]> = {}) {
    const handlers = { onReplay: vi.fn(), onTogglePause: vi.fn() };
    render(<PlayerControls isPaused={false} {...handlers} {...props} />);
    return handlers;
  }

  it('offers Replay and Pause, and calls back when they are pressed', () => {
    const { onReplay, onTogglePause } = player();
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('says Resume while paused', () => {
    player({ isPaused: true });
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  });

  it('disables Pause under reduced motion, but not Replay', () => {
    player({ reducedMotion: true });
    expect((screen.getByRole('button', { name: 'Pause' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: 'Replay' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('is a labelled group', () => {
    player();
    expect(screen.getByRole('group', { name: messages.player.controlsLabel })).toBeTruthy();
  });
});
