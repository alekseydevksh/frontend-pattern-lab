import { describe, expect, it, vi } from 'vitest';
import {
  PACKET_DURATION_MS,
  animatePacket,
  packetColor,
  packetEnds,
  packetKeyframes,
  setAnimationPaused,
} from './packets';
import type { Lane, Packet } from './types';

const lane: Lane = { x1: 100, x2: 300, y: 50 };
const packet: Packet = { lane: 'main', label: 'POST /like', tone: 'req' };

const positions = (frames: Keyframe[]) =>
  frames.map((frame) => String(frame.transform).match(/translate\((-?[\d.]+)px/)?.[1]);

describe('packetEnds', () => {
  it('runs from x1 to x2 by default and when dir is fwd', () => {
    expect(packetEnds(lane, packet)).toEqual({ from: 100, to: 300 });
    expect(packetEnds(lane, { ...packet, dir: 'fwd' })).toEqual({ from: 100, to: 300 });
  });

  it('runs from x2 to x1 when dir is back', () => {
    expect(packetEnds(lane, { ...packet, dir: 'back' })).toEqual({ from: 300, to: 100 });
  });

  it('respects a lane that is itself drawn right to left', () => {
    const push: Lane = { x1: 388, x2: 252, y: 120 };
    expect(packetEnds(push, packet)).toEqual({ from: 388, to: 252 });
  });
});

describe('packetKeyframes', () => {
  it('fades in, travels the whole lane, holds, then fades out', () => {
    const frames = packetKeyframes(lane, packet);
    expect(positions(frames)).toEqual(['100', '120', '300', '300']);
    expect(frames.map((f) => f.opacity)).toEqual([0, 1, 1, 0]);
    expect(frames.map((f) => f.offset)).toEqual([0, 0.1, 0.85, 1]);
  });

  it('keeps the lane height on every frame', () => {
    for (const frame of packetKeyframes(lane, packet)) {
      expect(String(frame.transform)).toMatch(/, 50px\)$/);
    }
  });

  it('travels back along the lane', () => {
    const frames = packetKeyframes(lane, { ...packet, dir: 'back' });
    expect(positions(frames)).toEqual(['300', '280', '100', '100']);
  });

  it('stops halfway when the packet is lost', () => {
    const frames = packetKeyframes(lane, { ...packet, lost: true });
    expect(positions(frames)).toEqual(['100', '110', '200', '200']);
    const back = packetKeyframes(lane, { ...packet, lost: true, dir: 'back' });
    expect(positions(back)).toEqual(['300', '290', '200', '200']);
  });
});

describe('packetColor', () => {
  it('points at the signal token of the tone, never at a literal colour', () => {
    expect(packetColor('req')).toBe('var(--req)');
    expect(packetColor('res')).toBe('var(--res)');
    expect(packetColor('ev')).toBe('var(--ev)');
    expect(packetColor('bad')).toBe('var(--bad)');
  });
});

describe('animatePacket', () => {
  it('starts one forward-filling animation of the packet duration', () => {
    const animation = { cancel: vi.fn() } as unknown as Animation;
    const animate = vi.fn(() => animation);
    const element = { animate } as unknown as Element;
    expect(animatePacket(element, lane, packet)).toBe(animation);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(packetKeyframes(lane, packet), {
      duration: PACKET_DURATION_MS,
      fill: 'forwards',
      easing: 'ease-in-out',
    });
  });

  it('returns null where the Web Animations API is missing', () => {
    expect(animatePacket({} as Element, lane, packet)).toBeNull();
  });
});

describe('setAnimationPaused', () => {
  const fake = (playState: AnimationPlayState) =>
    ({ playState, pause: vi.fn(), play: vi.fn() }) as unknown as Animation;

  it('pauses a running animation and resumes a paused one', () => {
    const running = fake('running');
    setAnimationPaused(running, true);
    expect(running.pause).toHaveBeenCalledTimes(1);
    const paused = fake('paused');
    setAnimationPaused(paused, false);
    expect(paused.play).toHaveBeenCalledTimes(1);
  });

  it('never restarts a finished animation', () => {
    const finished = fake('finished');
    setAnimationPaused(finished, false);
    setAnimationPaused(finished, true);
    expect(finished.play).not.toHaveBeenCalled();
    expect(finished.pause).not.toHaveBeenCalled();
  });

  it('does nothing when the state already matches', () => {
    const running = fake('running');
    setAnimationPaused(running, false);
    expect(running.play).not.toHaveBeenCalled();
    const paused = fake('paused');
    setAnimationPaused(paused, true);
    expect(paused.pause).not.toHaveBeenCalled();
  });
});
