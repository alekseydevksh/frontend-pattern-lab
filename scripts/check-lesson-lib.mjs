// The parts of `pnpm check:lesson` that read a tool's output and write the report. They are pure
// functions, so scripts/check-lesson.test.ts can run them on sample output.

/** Removes the colour codes a tool writes to a terminal. */
export const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

/** The two summary lines of a Vitest run: `{ files: '10 passed (10)', tests: '64 passed (64)' }`. */
export function parseVitest(text) {
  const lines = stripAnsi(text).split('\n');
  const after = (label) =>
    lines
      .map((line) => new RegExp(`^\\s*${label}\\s{2,}(.+?)\\s*$`).exec(line)?.[1])
      .find((found) => found !== undefined) ?? null;
  return { files: after('Test Files'), tests: after('Tests') };
}

/** The totals of a Playwright JSON report. */
export function parsePlaywright(report) {
  const stats = report?.stats ?? {};
  return {
    passed: stats.expected ?? 0,
    failed: stats.unexpected ?? 0,
    flaky: stats.flaky ?? 0,
    skipped: stats.skipped ?? 0,
    seconds: Math.round((stats.duration ?? 0) / 1000),
  };
}

/** The sum of several Playwright reports' totals. */
export function sumPlaywright(parts) {
  return parts.reduce(
    (sum, p) => ({
      passed: sum.passed + p.passed,
      failed: sum.failed + p.failed,
      flaky: sum.flaky + p.flaky,
      skipped: sum.skipped + p.skipped,
      seconds: sum.seconds + p.seconds,
    }),
    { passed: 0, failed: 0, flaky: 0, skipped: 0, seconds: 0 },
  );
}

/** The lines `pnpm lighthouse` prints for each page: scores, LCP, CLS and blocking time. */
export function parseLighthouse(text) {
  const pattern =
    /^(\/\S*)\s+performance (\d+) · accessibility (\d+) · best practices (\d+) · LCP ([\d.]+) s · CLS ([\d.]+) · TBT (\d+) ms/;
  return stripAnsi(text)
    .split('\n')
    .flatMap((line) => {
      const m = pattern.exec(line);
      return m
        ? [
            {
              path: m[1],
              performance: Number(m[2]),
              accessibility: Number(m[3]),
              bestPractices: Number(m[4]),
              lcp: m[5],
              cls: m[6],
              tbt: m[7],
            },
          ]
        : [];
    });
}

/** The last `count` lines of a tool's output, for a failed step. */
export const tail = (text, count = 25) =>
  stripAnsi(text).trimEnd().split('\n').slice(-count).join('\n');

const icon = { ok: '✅', fail: '❌', skipped: '⏭️' };

/** One row of a markdown table. */
const row = (cells) => `| ${cells.map((c) => String(c).replaceAll('|', '\\|')).join(' | ')} |`;

/**
 * The markdown block the owner pastes into a pull request: what ran, what each check found, the
 * size table and the Lighthouse numbers.
 *
 * `steps`: `{ name, status: 'ok' | 'fail' | 'skipped', detail, seconds }` in the order they ran.
 */
export function markdownReport({
  slug,
  branch,
  commit,
  steps,
  budgetTable,
  lighthouse,
  caffeinated,
}) {
  const failed = steps.filter((s) => s.status === 'fail');
  const out = [
    `### Checks for \`${slug}\``,
    '',
    `Branch \`${branch}\`, commit \`${commit}\`. ${
      failed.length === 0
        ? 'Every check passed.'
        : `**${failed.length} failed: ${failed.map((s) => s.name).join(', ')}.**`
    }${caffeinated ? '' : ' (The Mac was not kept awake: `caffeinate` is not available.)'}`,
    '',
    row(['Check', 'Result', 'Details', 'Time']),
    row(['---', '---', '---', '---:']),
    ...steps.map((s) =>
      row([
        s.name,
        `${icon[s.status]} ${s.status}`,
        s.detail ?? '',
        s.seconds ? `${s.seconds} s` : '',
      ]),
    ),
  ];
  if (budgetTable)
    out.push('', '**JavaScript per route** (gzipped, from the export)', '', budgetTable.trim());
  if (lighthouse?.length) {
    out.push(
      '',
      '**Lighthouse** (mobile profile, median of 5 runs)',
      '',
      row(['Page', 'Performance', 'Accessibility', 'Best practices', 'LCP', 'CLS', 'TBT']),
      row(['---', '---:', '---:', '---:', '---:', '---:', '---:']),
      ...lighthouse.map((l) =>
        row([
          `\`${l.path}\``,
          l.performance,
          l.accessibility,
          l.bestPractices,
          `${l.lcp} s`,
          l.cls,
          `${l.tbt} ms`,
        ]),
      ),
    );
  }
  return `${out.join('\n')}\n`;
}
