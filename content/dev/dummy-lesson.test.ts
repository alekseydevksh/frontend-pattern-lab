import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dummyScene } from '@/components/scenes/dev/DummyScene';
import { lessons, sceneRegistry } from '@/components/scenes/registry';
import { createManualClock } from '@/engine/testClock';
import { useLessonPlayer } from '@/engine/useLessonPlayer';
import { validateLesson } from '@/engine/validate';
import { dummyLesson } from './dummy-lesson';

describe('the dummy lesson for the player test page', () => {
  it('passes the same validation as a real lesson, against its own scene', () => {
    expect(validateLesson(dummyLesson, { dummy: dummyScene })).toEqual([]);
  });

  it('has no lesson page and is not in the scene registry, so it never reaches the catalog', () => {
    expect(lessons.map((l) => l.slug)).not.toContain(dummyLesson.slug);
    expect(Object.keys(sceneRegistry)).not.toContain(dummyLesson.sceneId);
  });

  it('plays from the first step to the last through the real hook, ending in its last state', () => {
    const clock = createManualClock();
    const { result } = renderHook(() =>
      useLessonPlayer(dummyLesson, dummyScene, { clock, reducedMotion: false }),
    );
    expect(result.current.metrics.map((m) => m.value)).toEqual(['start', 'empty', 'pending']);

    act(() => clock.advance(60_000));
    expect(result.current.metrics).toEqual([
      { value: 'start' },
      { value: 'received' },
      { value: 'answered', tone: 'good' },
    ]);

    for (let i = 1; i < dummyLesson.steps.length; i += 1) {
      act(() => result.current.next());
      expect(result.current.stepIndex).toBe(i);
      act(() => clock.advance(60_000));
    }
    expect(result.current.step.id).toBe('done');
    expect(result.current.state.status).toBe('Done');
    expect(result.current.activePackets).toEqual([]);
  });

  it('uses every kind of packet the engine knows: forward, back and lost', () => {
    const packets = dummyLesson.steps.flatMap((s) => s.frames.flatMap((f) => f.packet ?? []));
    expect(packets.some((p) => p.dir === undefined)).toBe(true);
    expect(packets.some((p) => p.dir === 'back')).toBe(true);
    expect(packets.some((p) => p.lost)).toBe(true);
  });
});
