import type { ActivePacket, SceneDefinition } from '@/engine/types';
import { cx } from '@/lib/cx';
import { PacketLayer } from './PacketLayer';

export interface DiagramProps<S> {
  scene: SceneDefinition<S>;
  state: S;
  packets: readonly ActivePacket[];
  paused: boolean;
  /** The text alternative of the diagram right now: the step's `sceneAlt`. */
  label: string;
  className?: string;
}

/**
 * The stage for a scene. It owns the <svg> (viewBox from the scene definition, an image role
 * with the step's text alternative) and draws the scene and its packets inside. The scene
 * only draws `state`; it never sets a timer or touches a packet. On narrow screens the SVG
 * keeps a readable minimum width and scrolls inside this box, rather than shrinking its text.
 */
export function Diagram<S>({ scene, state, packets, paused, label, className }: DiagramProps<S>) {
  const Scene = scene.Component;
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-control border-[1.5px] border-line bg-paper',
        className,
      )}
    >
      <svg
        role="img"
        aria-label={label}
        viewBox={scene.viewBox}
        className="block h-auto w-full min-w-[540px]"
      >
        <Scene state={state} />
        <PacketLayer packets={packets} paused={paused} />
      </svg>
    </div>
  );
}
