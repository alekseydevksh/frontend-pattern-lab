import { describe, expect, it } from 'vitest';
import { finalStateOf, patchState, startStateOf, stepAt } from './state';
import { createTestLesson, type TestState } from './testLesson';

const base: TestState = { value: 'v', count: 0, items: ['a', 'b'], nested: { a: 1, b: 2 } };

describe('patchState', () => {
  it('changes only the fields named in the patch', () => {
    expect(patchState(base, { value: 'w' })).toEqual({ ...base, value: 'w' });
  });

  it('replaces an array whole instead of merging it', () => {
    expect(patchState(base, { items: ['c'] }).items).toEqual(['c']);
    expect(patchState(base, { items: [] }).items).toEqual([]);
  });

  it('is shallow: a nested object is replaced whole, not merged', () => {
    expect(patchState(base, { nested: { a: 9, b: 0 } }).nested).toEqual({ a: 9, b: 0 });
    // @ts-expect-error a partial nested object is not a valid patch, and must not be merged
    expect(patchState(base, { nested: { a: 9 } }).nested).toEqual({ a: 9 });
  });

  it('applies an explicit undefined, which clears an optional field', () => {
    const withOptional = { value: 'v', note: 'x' } as { value: string; note?: string };
    expect(patchState(withOptional, { note: undefined }).note).toBeUndefined();
  });

  it('never changes its input', () => {
    const frozen = Object.freeze({ ...base, items: Object.freeze(['a']) as string[] });
    const next = patchState(frozen, { value: 'w', items: ['z'] });
    expect(frozen.value).toBe('v');
    expect(frozen.items).toEqual(['a']);
    expect(next).not.toBe(frozen);
  });

  it('returns the same object for no patch', () => {
    expect(patchState(base, undefined)).toBe(base);
  });
});

describe('startStateOf and finalStateOf', () => {
  const lesson = createTestLesson();

  it('starts from baseState when the step has no startState', () => {
    expect(startStateOf(lesson, stepAt(lesson, 0))).toEqual(lesson.baseState);
  });

  it('merges startState over baseState', () => {
    expect(startStateOf(lesson, stepAt(lesson, 1))).toEqual({
      ...lesson.baseState,
      value: 'second-start',
      count: 10,
    });
  });

  it('does not carry the end of one step into the next', () => {
    expect(startStateOf(lesson, stepAt(lesson, 2))).toEqual(lesson.baseState);
  });

  it('applies every frame in order for the final state, later frames winning', () => {
    expect(finalStateOf(lesson, stepAt(lesson, 0))).toEqual({
      value: 'b',
      count: 1,
      items: ['x', 'y'],
      nested: { a: 1, b: 1 },
    });
  });
});

describe('stepAt', () => {
  it('throws for a step that does not exist', () => {
    const lesson = createTestLesson();
    expect(() => stepAt(lesson, 3)).toThrow(/no step 3/);
    expect(() => stepAt(lesson, -1)).toThrow(/no step -1/);
  });
});
