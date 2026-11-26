/**
 * The `?step=N` deep link. N counts from 1, as the learner sees it ("Step 3 of 6"); the
 * functions here return and take indexes from 0, as the player does. Plain functions, so
 * they can be tested without a browser.
 */

export const STEP_PARAM = 'step';

/**
 * The step index a query string asks for, or null when it asks for nothing usable.
 *
 * A whole number outside the lesson is clamped to the first or last step. Anything that is
 * not a whole number (`abc`, `2.5`, `1e2`, an empty value) is ignored, like a missing
 * parameter, because there is no sensible step to clamp it to. The first `step` wins.
 */
export function parseStepParam(search: string, stepCount: number): number | null {
  if (!Number.isInteger(stepCount) || stepCount < 1) return null;
  const value = new URLSearchParams(search).get(STEP_PARAM);
  if (value === null || !/^[+-]?\d+$/.test(value)) return null;
  const number = Number(value); // a huge value becomes Infinity, which clamps like any other
  return Math.min(Math.max(number, 1), stepCount) - 1;
}

/**
 * The query string for being on step `stepIndex`, keeping any other parameters. The first
 * step has no parameter, so the plain lesson address stays the clean one. Returns '' or a
 * string that starts with `?`.
 */
export function withStepParam(search: string, stepIndex: number): string {
  const params = new URLSearchParams(search);
  if (stepIndex <= 0) params.delete(STEP_PARAM);
  else params.set(STEP_PARAM, String(Math.trunc(stepIndex) + 1));
  const query = params.toString();
  return query ? `?${query}` : '';
}
