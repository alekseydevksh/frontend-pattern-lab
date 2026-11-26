'use client';

import { useEffect, useRef } from 'react';
import { animatePacket, setAnimationPaused } from '@/engine/packets';
import type { ActivePacket, Tone } from '@/engine/types';

// Literal class names, so Tailwind can see them. Each is the signal token with that meaning.
const toneFill: Record<Tone, string> = {
  req: 'fill-req',
  res: 'fill-res',
  ev: 'fill-ev',
  bad: 'fill-bad',
};

export interface PacketLayerProps {
  packets: readonly ActivePacket[];
  /** Pauses the animations in flight, and resumes them when it turns false. */
  paused: boolean;
}

/**
 * Draws the packets in flight, as SVG, on top of a scene. Put it inside the same <svg>, after
 * the scene. Each packet is a labelled dot that the Web Animations API moves along its lane.
 * A packet's element is removed when the player drops it from `packets`, which also cancels
 * its animation, so nothing outlives a step change.
 */
export function PacketLayer({ packets, paused }: PacketLayerProps) {
  return (
    <g aria-hidden="true">
      {packets.map((active) => (
        <PacketMark key={active.key} active={active} paused={paused} />
      ))}
    </g>
  );
}

function PacketMark({ active, paused }: { active: ActivePacket; paused: boolean }) {
  const element = useRef<SVGGElement>(null);
  const animation = useRef<Animation | null>(null);
  const { packet, lane } = active;

  useEffect(() => {
    if (!element.current) return;
    const started = animatePacket(element.current, lane, packet);
    animation.current = started;
    return () => {
      started?.cancel();
      animation.current = null;
    };
  }, [lane, packet]);

  useEffect(() => {
    if (animation.current) setAnimationPaused(animation.current, paused);
  }, [paused]);

  return (
    // Hidden until the animation takes over, so it never flashes at the lane's origin.
    <g ref={element} className="opacity-0">
      <text
        y={-15}
        textAnchor="middle"
        className="fill-ink stroke-paper stroke-4 font-mono text-micro font-semibold [paint-order:stroke] [stroke-linejoin:round]"
      >
        {packet.label}
      </text>
      <circle r={7} className={toneFill[packet.tone]} />
    </g>
  );
}
