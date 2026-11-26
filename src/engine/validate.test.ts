import { describe, expect, it } from 'vitest';
import { createTestLesson, testScene, type TestState } from './testLesson';
import type { Lesson } from './types';
import { validateLesson, validateLessons } from './validate';

const scenes = { test: testScene };

/** A valid lesson, changed by `edit` to break exactly one rule. */
function broken(edit: (lesson: Lesson<TestState>) => void): Lesson<TestState> {
  const lesson = createTestLesson();
  edit(lesson);
  return lesson;
}

const problemsOf = (lesson: Lesson<TestState>) => validateLesson(lesson, scenes);
const first = (lesson: Lesson<TestState>) => lesson.steps[0]!;

describe('validateLesson: a good lesson', () => {
  it('has no problems', () => {
    expect(problemsOf(createTestLesson())).toEqual([]);
  });

  it('allows frames that share a time, and a first frame at 0', () => {
    const lesson = broken((l) => {
      first(l).frames = [
        { at: 0, set: { value: 'x' } },
        { at: 0, set: { count: 1 } },
        { at: 100, set: { count: 2 } },
      ];
    });
    expect(problemsOf(lesson)).toEqual([]);
  });

  it('allows a step with no frames, such as a summary', () => {
    expect(problemsOf(broken((l) => (first(l).frames = [])))).toEqual([]);
  });

  it('does not ask the last step for a short title', () => {
    const lesson = createTestLesson();
    expect(lesson.steps[2]!.shortTitle).toBe('');
    expect(problemsOf(lesson)).toEqual([]);
  });
});

describe('validateLesson: the rules in the spec', () => {
  it('fails when step ids repeat', () => {
    const lesson = broken((l) => (l.steps[1]!.id = 'first'));
    expect(problemsOf(lesson)).toEqual([expect.stringMatching(/step 2 \("first"\).*used twice/)]);
  });

  it('fails when takeawayIndex is past the end', () => {
    const lesson = broken((l) => (first(l).takeawayIndex = 2));
    expect(problemsOf(lesson).join('\n')).toMatch(/takeawayIndex 2 is out of range/);
  });

  it('fails when takeawayIndex is negative or not a whole number', () => {
    expect(problemsOf(broken((l) => (first(l).takeawayIndex = -1))).join('\n')).toMatch(
      /takeawayIndex -1 is out of range/,
    );
    expect(problemsOf(broken((l) => (first(l).takeawayIndex = 0.5))).join('\n')).toMatch(
      /takeawayIndex 0.5 is out of range/,
    );
  });

  it('fails when frames are not sorted by at', () => {
    const lesson = broken((l) => {
      first(l).frames = [
        { at: 300, set: { value: 'a' } },
        { at: 100, set: { value: 'b' } },
      ];
    });
    expect(problemsOf(lesson)).toEqual([
      expect.stringMatching(/frame 2: frames must be sorted by "at", but 100 comes after 300/),
    ]);
  });

  it('fails when the sceneId is not in the registry', () => {
    const lesson = broken((l) => (l.sceneId = 'missing'));
    expect(problemsOf(lesson)).toEqual([
      expect.stringMatching(/sceneId "missing" is not in the scene registry/),
    ]);
  });

  it('fails when a packet names a lane the scene does not define', () => {
    const lesson = broken((l) => {
      first(l).frames = [{ at: 0, packet: { lane: 'sideways', label: 'x', tone: 'req' } }];
    });
    expect(problemsOf(lesson)).toEqual([
      expect.stringMatching(/lane "sideways", which scene "test" does not define \(it has: main\)/),
    ]);
  });

  it('fails when sceneAlt is empty or only spaces', () => {
    expect(problemsOf(broken((l) => (first(l).sceneAlt = ''))).join('\n')).toMatch(
      /sceneAlt is empty/,
    );
    expect(problemsOf(broken((l) => (first(l).sceneAlt = '   '))).join('\n')).toMatch(
      /sceneAlt is empty/,
    );
  });

  it('reports every problem at once, not only the first', () => {
    const lesson = broken((l) => {
      l.steps[1]!.id = 'first';
      first(l).sceneAlt = '';
      first(l).takeawayIndex = 9;
    });
    expect(problemsOf(lesson).length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateLesson: further rules', () => {
  it('fails on a frame time that is negative or not a number', () => {
    for (const at of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const lesson = broken((l) => (first(l).frames = [{ at }]));
      expect(problemsOf(lesson).join('\n')).toMatch(/"at" must be a number of milliseconds/);
    }
  });

  it('fails when a takeaway is never ticked, so it could never be completed', () => {
    const lesson = broken((l) => {
      l.steps[1]!.takeawayIndex = 0;
      l.steps[2]!.takeawayIndex = 0;
    });
    expect(problemsOf(lesson)).toEqual([expect.stringMatching(/no step ticks takeaway 1/)]);
  });

  it('fails on empty text fields', () => {
    expect(problemsOf(broken((l) => (first(l).title = ''))).join('\n')).toMatch(/title is empty/);
    expect(problemsOf(broken((l) => (first(l).keyIdea = ' '))).join('\n')).toMatch(
      /key idea is empty/,
    );
    expect(problemsOf(broken((l) => (first(l).body = []))).join('\n')).toMatch(/body needs/);
    expect(problemsOf(broken((l) => (first(l).body = ['ok', '']))).join('\n')).toMatch(
      /body needs/,
    );
    expect(problemsOf(broken((l) => (l.steps[0]!.shortTitle = ''))).join('\n')).toMatch(
      /short title is empty/,
    );
  });

  it('fails on a slug that is not lower-case words joined by hyphens', () => {
    for (const slug of ['Test Lesson', 'test_lesson', '-test', 'test-', '']) {
      expect(problemsOf(broken((l) => (l.slug = slug))).join('\n')).toMatch(/slug must be/);
    }
  });

  it('fails on a lesson without steps or takeaways', () => {
    expect(problemsOf(broken((l) => (l.steps = []))).join('\n')).toMatch(/needs steps/);
    expect(problemsOf(broken((l) => (l.takeaways = []))).join('\n')).toMatch(/no takeaways/);
  });
});

describe('validateLessons: across lessons', () => {
  it('has no problems for an empty list', () => {
    expect(validateLessons([], scenes)).toEqual([]);
  });

  it('fails when two lessons share a slug or an order', () => {
    const a = createTestLesson();
    const b = createTestLesson();
    const problems = validateLessons([a, b], scenes);
    expect(problems).toContain('Lesson slug "test-lesson" is used twice.');
    expect(problems).toContain('Lesson order 1 is used twice.');
  });

  it('collects the problems of every lesson', () => {
    const a = broken((l) => (first(l).sceneAlt = ''));
    const b = broken((l) => {
      l.slug = 'other';
      l.order = 2;
      l.sceneId = 'missing';
    });
    const problems = validateLessons([a, b], scenes);
    expect(problems.some((p) => p.includes('"test-lesson"') && p.includes('sceneAlt'))).toBe(true);
    expect(problems.some((p) => p.includes('"other"') && p.includes('"missing"'))).toBe(true);
  });
});
