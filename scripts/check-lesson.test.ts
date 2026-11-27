// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The reading of tool output and the report of `pnpm check:lesson`, on sample output. The script
 * itself runs the project's tools and is exercised by running it (the pull request says so).
 */

const lib = await import(pathToFileURL(join(__dirname, 'check-lesson-lib.mjs')).href);

describe('scripts/check-lesson-lib.mjs', () => {
  it('reads the summary of a Vitest run, colour codes and all', () => {
    const out =
      '\u001b[2m Test Files \u001b[22m \u001b[1m\u001b[32m10 passed\u001b[39m\u001b[22m\u001b[90m (10)\u001b[39m\n' +
      ' Test Files  10 passed (10)\n      Tests  64 passed (64)\n   Start at  21:57:59\n';
    expect(lib.parseVitest(out)).toEqual({ files: '10 passed (10)', tests: '64 passed (64)' });
    expect(lib.parseVitest('Tests  1 failed | 63 passed (64)\n').tests).toBe(
      '1 failed | 63 passed (64)',
    );
    expect(lib.parseVitest('nothing here')).toEqual({ files: null, tests: null });
  });

  it('adds up Playwright totals', () => {
    const a = lib.parsePlaywright({
      stats: { expected: 8, unexpected: 0, flaky: 1, skipped: 0, duration: 4200 },
    });
    const b = lib.parsePlaywright({
      stats: { expected: 30, unexpected: 2, skipped: 1, duration: 9800 },
    });
    expect(a).toEqual({ passed: 8, failed: 0, flaky: 1, skipped: 0, seconds: 4 });
    expect(lib.sumPlaywright([a, b])).toEqual({
      passed: 38,
      failed: 2,
      flaky: 1,
      skipped: 1,
      seconds: 14,
    });
    expect(lib.parsePlaywright(undefined).passed).toBe(0);
  });

  it('reads the Lighthouse lines of each page', () => {
    const out = [
      'Lighthouse, mobile profile, median of 5 runs',
      '/                            performance 100 · accessibility 100 · best practices 100 · LCP 0.75 s · CLS 0.000 · TBT 0 ms',
      '/lessons/state-ownership/    performance 99 · accessibility 100 · best practices 100 · LCP 0.78 s · CLS 0.000 · TBT 37 ms',
    ].join('\n');
    expect(lib.parseLighthouse(out)).toEqual([
      {
        path: '/',
        performance: 100,
        accessibility: 100,
        bestPractices: 100,
        lcp: '0.75',
        cls: '0.000',
        tbt: '0',
      },
      {
        path: '/lessons/state-ownership/',
        performance: 99,
        accessibility: 100,
        bestPractices: 100,
        lcp: '0.78',
        cls: '0.000',
        tbt: '37',
      },
    ]);
    expect(lib.parseLighthouse('no numbers')).toEqual([]);
  });

  it('writes a markdown block with every check, the size table and the Lighthouse numbers', () => {
    const report = lib.markdownReport({
      slug: 'state-ownership',
      branch: 'm5-lesson-06-state-ownership',
      commit: 'abc1234',
      caffeinated: true,
      steps: [
        { name: 'Lint', status: 'ok', detail: '', seconds: 3 },
        { name: 'Unit tests', status: 'ok', detail: '64 passed (64)', seconds: 5 },
        { name: 'Lighthouse', status: 'skipped', detail: 'skipped with --skip', seconds: 0 },
      ],
      budgetTable: '| Route | Gzipped JS |\n| --- | ---: |\n| `/` | 139.2 KB |',
      lighthouse: [
        {
          path: '/',
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          lcp: '0.75',
          cls: '0.000',
          tbt: '0',
        },
      ],
    });
    expect(report).toContain('### Checks for `state-ownership`');
    expect(report).toContain('Every check passed.');
    expect(report).toContain('| Unit tests | ✅ ok | 64 passed (64) | 5 s |');
    expect(report).toContain('| Lighthouse | ⏭️ skipped |');
    expect(report).toContain('| `/` | 139.2 KB |');
    expect(report).toContain('| `/` | 100 | 100 | 100 | 0.75 s | 0.000 | 0 ms |');
  });

  it('keeps a pipe in the details of a check from breaking the table', () => {
    const report = lib.markdownReport({
      slug: 'x',
      branch: 'b',
      commit: 'c',
      caffeinated: true,
      steps: [{ name: 'Unit tests', status: 'fail', detail: '2 failed | 551 passed', seconds: 3 }],
      budgetTable: null,
      lighthouse: [],
    });
    expect(report).toContain('| 2 failed \\| 551 passed |');
  });

  it('says which checks failed', () => {
    const report = lib.markdownReport({
      slug: 'x',
      branch: 'b',
      commit: 'c',
      caffeinated: false,
      steps: [
        { name: 'Lint', status: 'fail', detail: '3 errors', seconds: 2 },
        { name: 'Build', status: 'fail', detail: '', seconds: 9 },
      ],
      budgetTable: null,
      lighthouse: [],
    });
    expect(report).toContain('**2 failed: Lint, Build.**');
    expect(report).toContain('| Lint | ❌ fail | 3 errors | 2 s |');
    expect(report).toContain('`caffeinate` is not available');
  });
});

describe('scripts/check-lesson.mjs', () => {
  const run = (...args: string[]) =>
    spawnSync('node', [join(__dirname, 'check-lesson.mjs'), ...args], { encoding: 'utf8' });

  it('asks for a slug, and refuses one that is not a lesson', () => {
    const none = run();
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('Usage: pnpm check:lesson <slug>');
    const unknown = run('no-such-lesson');
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('no-such-lesson is not a lesson');
    expect(run('../etc').status).toBe(2);
  });
});
