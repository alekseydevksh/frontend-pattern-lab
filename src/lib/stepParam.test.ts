import { describe, expect, it } from 'vitest';
import { parseStepParam, withStepParam } from './stepParam';

describe('parseStepParam', () => {
  it('turns the learner’s step number into a player index', () => {
    expect(parseStepParam('?step=1', 6)).toBe(0);
    expect(parseStepParam('?step=3', 6)).toBe(2);
    expect(parseStepParam('?step=6', 6)).toBe(5);
  });

  it('works with or without the leading question mark and among other parameters', () => {
    expect(parseStepParam('step=2', 6)).toBe(1);
    expect(parseStepParam('?utm=x&step=4&a=b', 6)).toBe(3);
  });

  it('asks for nothing when the parameter is missing', () => {
    expect(parseStepParam('', 6)).toBeNull();
    expect(parseStepParam('?other=3', 6)).toBeNull();
  });

  it('clamps whole numbers outside the lesson to the first or last step', () => {
    expect(parseStepParam('?step=0', 6)).toBe(0);
    expect(parseStepParam('?step=-4', 6)).toBe(0);
    expect(parseStepParam('?step=7', 6)).toBe(5);
    expect(parseStepParam('?step=99999', 6)).toBe(5);
    expect(parseStepParam(`?step=${'9'.repeat(400)}`, 6)).toBe(5);
  });

  it('accepts a plus sign', () => {
    expect(parseStepParam('?step=%2B2', 6)).toBe(1);
  });

  it('ignores a value that is not a whole number', () => {
    for (const bad of ['abc', '', '2.5', '1e2', '0x3', ' 3', '3 ', 'NaN', 'Infinity', '--1']) {
      expect(parseStepParam(`?step=${encodeURIComponent(bad)}`, 6), JSON.stringify(bad)).toBeNull();
    }
  });

  it('uses the first step parameter when there are several', () => {
    expect(parseStepParam('?step=2&step=5', 6)).toBe(1);
  });

  it('asks for nothing when the lesson has no steps', () => {
    expect(parseStepParam('?step=1', 0)).toBeNull();
    expect(parseStepParam('?step=1', Number.NaN)).toBeNull();
  });

  it('clamps to the only step of a one-step lesson', () => {
    expect(parseStepParam('?step=5', 1)).toBe(0);
  });
});

describe('withStepParam', () => {
  it('writes the step number, counting from 1', () => {
    expect(withStepParam('', 2)).toBe('?step=3');
  });

  it('leaves the first step with no parameter, so the plain address stays the clean one', () => {
    expect(withStepParam('', 0)).toBe('');
    expect(withStepParam('?step=4', 0)).toBe('');
  });

  it('replaces an earlier step and keeps other parameters', () => {
    expect(withStepParam('?step=2&a=b', 4)).toBe('?step=5&a=b');
    expect(withStepParam('?a=b&step=2', 0)).toBe('?a=b');
  });

  it('round-trips with parseStepParam', () => {
    for (let i = 0; i < 6; i += 1) {
      expect(parseStepParam(withStepParam('', i), 6) ?? 0).toBe(i);
    }
  });
});
