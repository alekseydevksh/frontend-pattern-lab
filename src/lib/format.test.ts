import { describe, expect, it } from 'vitest';
import { format } from './format';

describe('format', () => {
  it('fills placeholders, numbers included', () => {
    expect(format('Step {current} of {total}', { current: 2, total: 5 })).toBe('Step 2 of 5');
  });

  it('lets a translation reorder the placeholders and repeat one', () => {
    expect(format('{b} / {a} / {a}', { a: 'x', b: 'y' })).toBe('y / x / x');
  });

  it('leaves a placeholder with no value as written', () => {
    expect(format('Next: {title}', {})).toBe('Next: {title}');
  });

  it('does not treat the values as templates, or read inherited names', () => {
    expect(format('{a}', { a: '{b}', b: 'no' })).toBe('{b}');
    expect(format('{toString}', {})).toBe('{toString}');
  });

  it('returns a text without placeholders unchanged', () => {
    expect(format('Replay', { a: 1 })).toBe('Replay');
  });
});
