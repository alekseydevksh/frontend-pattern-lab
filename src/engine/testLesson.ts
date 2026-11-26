import type { Lesson, SceneDefinition } from './types';

/** A small lesson and scene for engine tests. Nothing here is a real lesson. */
export interface TestState {
  value: string;
  count: number;
  items: string[];
  nested: { a: number; b: number };
}

export const testScene: SceneDefinition<TestState> = {
  viewBox: '0 0 100 40',
  lanes: { main: { x1: 0, x2: 100, y: 10 } },
  Component: () => null,
  metrics: (s) => [
    { value: s.value },
    { value: String(s.count), tone: s.count > 5 ? 'bad' : 'good' },
    { value: s.items.join(',') },
  ],
};

export function createTestLesson(): Lesson<TestState> {
  const common = { tag: 'TAG', tone: 'neutral' as const, body: ['Body.'], keyIdea: 'Idea.' };
  return {
    slug: 'test-lesson',
    order: 1,
    track: 'Structure',
    title: 'Test lesson',
    summary: 'A lesson for engine tests.',
    minutes: 1,
    level: 'Beginner',
    sourceSections: [],
    takeaways: ['One', 'Two'],
    metricLabels: ['A', 'B', 'C'],
    sceneId: 'test',
    baseState: { value: 'base', count: 0, items: [], nested: { a: 1, b: 1 } },
    steps: [
      {
        ...common,
        id: 'first',
        title: 'First',
        shortTitle: 'Go second',
        takeawayIndex: 0,
        sceneAlt: 'First step.',
        frames: [
          { at: 100, set: { value: 'a' } },
          {
            at: 300,
            set: { value: 'b', items: ['x', 'y'] },
            packet: { lane: 'main', label: 'request', tone: 'req' },
          },
          {
            at: 600,
            set: { count: 1 },
            packet: { lane: 'main', dir: 'back', label: 'answer', tone: 'res' },
          },
        ],
      },
      {
        ...common,
        id: 'second',
        title: 'Second',
        shortTitle: 'Go third',
        takeawayIndex: 1,
        sceneAlt: 'Second step.',
        startState: { value: 'second-start', count: 10 },
        frames: [{ at: 200, set: { value: 'second-end' } }],
      },
      {
        ...common,
        id: 'third',
        title: 'Third',
        shortTitle: '',
        takeawayIndex: 1,
        sceneAlt: 'Third step.',
        frames: [
          { at: 0, set: { value: 'third-0' } },
          { at: 500, set: { nested: { a: 2, b: 0 } } },
        ],
      },
    ],
  };
}
