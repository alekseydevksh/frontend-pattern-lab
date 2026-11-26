import type { Lane, Packet, Tone } from './types';

/**
 * Packet helpers. A packet is a labelled dot that travels along a lane. The animation is the
 * Web Animations API, so the browser runs it off the main thread and it can be paused and
 * resumed. This file has no React in it.
 */

/** How long a packet is on screen. The player also uses it to know when a packet is gone. */
export const PACKET_DURATION_MS = 900;

/** The CSS colour of a packet: the signal token that has the packet's meaning. */
export function packetColor(tone: Tone): string {
  return `var(--${tone})`;
}

/** Where along the lane the packet starts and where it would end if it arrives. */
export function packetEnds(lane: Lane, packet: Packet): { from: number; to: number } {
  return packet.dir === 'back' ? { from: lane.x2, to: lane.x1 } : { from: lane.x1, to: lane.x2 };
}

/**
 * Keyframes for one packet: fade in over the first tenth, travel, hold, fade out at the end.
 * A lost packet only travels half of the lane before it fades.
 */
export function packetKeyframes(lane: Lane, packet: Packet): Keyframe[] {
  const { from, to } = packetEnds(lane, packet);
  const end = packet.lost ? from + (to - from) * 0.5 : to;
  const at = (x: number) => `translate(${x}px, ${lane.y}px)`;
  return [
    { transform: at(from), opacity: 0, offset: 0 },
    { transform: at(from + (end - from) * 0.1), opacity: 1, offset: 0.1 },
    { transform: at(end), opacity: 1, offset: 0.85 },
    { transform: at(end), opacity: 0, offset: 1 },
  ];
}

/**
 * Starts the animation on `element`, or returns null where the Web Animations API does not
 * exist (for example in jsdom). Cancel the returned animation to clean up.
 */
export function animatePacket(element: Element, lane: Lane, packet: Packet): Animation | null {
  if (typeof element.animate !== 'function') return null;
  return element.animate(packetKeyframes(lane, packet), {
    duration: PACKET_DURATION_MS,
    fill: 'forwards',
    easing: 'ease-in-out',
  });
}

/**
 * Pauses or resumes an animation without ever restarting a finished one: calling `play()`
 * on a finished animation would send the packet down the lane again.
 */
export function setAnimationPaused(animation: Animation, paused: boolean): void {
  if (paused) {
    if (animation.playState === 'running') animation.pause();
  } else if (animation.playState === 'paused') {
    animation.play();
  }
}
