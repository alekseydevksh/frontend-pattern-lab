import type { DummyState } from '@/components/scenes/dev/DummyScene';
import type { Lesson } from '@/engine/types';

/**
 * A throwaway lesson for the player test page (/dev/player/). It is not in the lesson
 * registry, so it never reaches the catalog. It has four short steps that use every part of
 * the data model the engine plays: frames, a state patch, a packet both ways, a lost packet
 * and a step with its own start state. The wording is placeholder text about the test itself.
 */
const base: DummyState = {
  leftTitle: 'SENDER',
  rightTitle: 'RECEIVER',
  laneLabel: 'LANE',
  status: 'Idle',
  statusKind: 'idle',
  leftValue: 'start',
  rightValue: 'empty',
  outcome: 'pending',
  outcomeKind: 'none',
};

export const dummyLesson: Lesson<DummyState> = {
  slug: 'player-test',
  order: 1,
  status: 'published',
  track: 'Structure',
  title: 'Player test lesson',
  summary: 'A dummy lesson that exercises the lesson player from start to finish.',
  minutes: 1,
  level: 'Beginner',
  sourceSections: [],
  takeaways: [
    'A step shows its start state first',
    'Frames run on a timeline',
    'A packet can be lost on the way',
  ],
  metricLabels: ['Sender', 'Receiver', 'Outcome'],
  sceneId: 'dummy',
  baseState: base,
  steps: [
    {
      id: 'send',
      tag: 'REQUEST',
      tone: 'req',
      title: 'A message goes out',
      shortTitle: 'The answer comes back',
      body: [
        'The sender starts a message. Its packet crosses the lane and the sender waits.',
        'Nothing here is real. The step only checks that the frames run in order.',
      ],
      keyIdea: 'The step opens on its start state and then plays its frames.',
      takeawayIndex: 0,
      sceneAlt:
        'A sender on the left and a receiver on the right, joined by a lane. The sender is idle and the receiver is empty.',
      frames: [
        {
          at: 200,
          set: { status: 'Waiting for an answer', statusKind: 'wait' },
          packet: { lane: 'main', label: 'ping', tone: 'req' },
        },
        {
          at: 1100,
          set: { rightValue: 'received' },
          packet: { lane: 'main', dir: 'back', label: 'pong', tone: 'res' },
        },
        {
          at: 2000,
          set: {
            status: 'Answer received',
            statusKind: 'ok',
            outcome: 'answered',
            outcomeKind: 'good',
          },
        },
      ],
    },
    {
      id: 'restart',
      tag: 'STATE',
      tone: 'ev',
      title: 'Every step starts fresh',
      shortTitle: 'Lose a packet',
      body: ['This step begins with its own start state, not with where the last step ended.'],
      keyIdea: 'Going back or replaying always begins from the base state of the lesson.',
      takeawayIndex: 0,
      sceneAlt:
        'The same two panels. The sender already holds the value ready and the receiver is empty.',
      startState: { leftValue: 'ready' },
      frames: [
        { at: 300, set: { leftValue: 'sent', status: 'Sent', statusKind: 'ok' } },
        { at: 900, set: { rightValue: 'stored' } },
      ],
    },
    {
      id: 'lose',
      tag: 'FAILURE',
      tone: 'bad',
      title: 'A packet can be lost',
      shortTitle: 'Wrap up',
      body: ['This packet stops halfway and fades. The sender never gets an answer.'],
      keyIdea: 'A lost packet is shown in the diagram and also named in words.',
      takeawayIndex: 2,
      sceneAlt:
        'The sender sends a packet that stops halfway along the lane and fades. The sender reports that no answer came.',
      frames: [
        {
          at: 200,
          set: { status: 'Waiting for an answer', statusKind: 'wait' },
          packet: { lane: 'main', label: 'ping', tone: 'bad', lost: true },
        },
        {
          at: 1400,
          set: { status: 'No answer', statusKind: 'bad', outcome: 'lost', outcomeKind: 'bad' },
        },
      ],
    },
    {
      id: 'done',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'That is the whole test',
      shortTitle: '',
      body: ['A step with no frames shows its start state and stays still.'],
      keyIdea: 'The last step has no Next, so the button offers to restart.',
      takeawayIndex: 1,
      sceneAlt: 'The two panels at rest, with nothing in flight and nothing to report.',
      startState: { status: 'Done', statusKind: 'ok', leftValue: 'ready', rightValue: 'stored' },
      frames: [],
    },
  ],
};
