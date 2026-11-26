import type { SceneDefinition } from '@/engine/types';

/**
 * A throwaway scene for the player test page (/dev/player/). It exists to prove the engine
 * plays a lesson end to end. It is not a lesson scene and is not in the scene registry.
 *
 * Like every scene it is pure: the same state always draws the same SVG, and every word on
 * screen comes from the state, which comes from the lesson data.
 */
export type DummyStatusKind = 'idle' | 'wait' | 'ok' | 'bad';

export interface DummyState {
  leftTitle: string;
  rightTitle: string;
  laneLabel: string;
  /** What the left panel says it is doing. */
  status: string;
  statusKind: DummyStatusKind;
  leftValue: string;
  rightValue: string;
  /** Shown in the third metric: how the exchange ended, or a word for "not yet". */
  outcome: string;
  outcomeKind: 'good' | 'bad' | 'none';
}

const statusClass: Record<DummyStatusKind, string> = {
  idle: 'fill-muted-text',
  wait: 'fill-req-text',
  ok: 'fill-res-text',
  bad: 'fill-bad-text',
};

const caption = 'font-mono text-label tracking-caps-wide fill-muted-text uppercase';
const panel = 'fill-panel stroke-line stroke-[1.5]';
const inner = 'fill-paper stroke-line stroke-[1.5]';
const value = 'font-mono text-[20px] font-semibold fill-ink';

function DummySceneDrawing({ state }: { state: DummyState }) {
  return (
    <g>
      <rect className={panel} x={16} y={16} width={236} height={188} rx={14} />
      <text className={caption} x={32} y={40}>
        {state.leftTitle}
      </text>
      <rect className={inner} x={32} y={52} width={204} height={96} rx={10} />
      <text className={value} x={48} y={96}>
        {state.leftValue}
      </text>
      <text
        className={`font-body text-[12.5px] font-medium ${statusClass[state.statusKind]}`}
        x={48}
        y={128}
      >
        {state.status}
      </text>

      <rect className={panel} x={388} y={16} width={236} height={188} rx={14} />
      <text className={caption} x={404} y={40}>
        {state.rightTitle}
      </text>
      <rect className={inner} x={404} y={52} width={204} height={96} rx={10} />
      <text className={value} x={420} y={96}>
        {state.rightValue}
      </text>

      <line
        className="stroke-line stroke-2 [stroke-dasharray:3_5]"
        x1={252}
        y1={130}
        x2={388}
        y2={130}
      />
      <text className={caption} x={320} y={156} textAnchor="middle">
        {state.laneLabel}
      </text>
    </g>
  );
}

export const dummyScene: SceneDefinition<DummyState> = {
  viewBox: '0 0 640 220',
  lanes: { main: { x1: 252, x2: 388, y: 130 } },
  Component: DummySceneDrawing,
  metrics: (state) => [
    { value: state.leftValue },
    { value: state.rightValue },
    {
      value: state.outcome,
      tone: state.outcomeKind === 'none' ? undefined : state.outcomeKind,
    },
  ],
};
