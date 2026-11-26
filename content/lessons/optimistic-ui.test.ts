import { describe, expect, it } from 'vitest';
import { finalStateOf, startStateOf } from '@/engine/state';
import type { OptimisticUiState } from '@/components/scenes/OptimisticUiScene';
import { optimisticUi } from './optimistic-ui';

/**
 * The time markers fade out where they stand when a step changes (D14). The scene holds no state
 * to remember that, so the lesson data has to say where each marker stood: every step starts with
 * both markers hidden at the position the step before left them in.
 */
describe('optimistic-ui time markers', () => {
  const steps = optimisticUi.steps;

  it('starts the first step with both markers unplaced and hidden', () => {
    const start = startStateOf(optimisticUi, steps[0]!);
    expect([start.uiAt, start.serverAt, start.uiShown, start.serverShown]).toEqual([
      null,
      null,
      false,
      false,
    ]);
  });

  it.each(steps.slice(1).map((step, i) => [step.id, i + 1] as const))(
    '%s starts with both markers hidden where the step before left them',
    (_id, index) => {
      const before = finalStateOf(optimisticUi, steps[index - 1]!);
      const start = startStateOf(optimisticUi, steps[index]!);
      expect(start.uiShown).toBe(false);
      expect(start.serverShown).toBe(false);
      expect(start.uiAt).toBe(before.uiAt);
      expect(start.serverAt).toBe(before.serverAt);
    },
  );

  it('never shows a marker that has no position', () => {
    for (const step of steps) {
      const states: OptimisticUiState[] = [
        startStateOf(optimisticUi, step),
        ...step.frames.map((_, f) =>
          finalStateOf(optimisticUi, { ...step, frames: step.frames.slice(0, f + 1) }),
        ),
      ];
      for (const state of states) {
        if (state.uiShown) expect(state.uiAt, step.id).not.toBeNull();
        if (state.serverShown) expect(state.serverAt, step.id).not.toBeNull();
      }
    }
  });
});
