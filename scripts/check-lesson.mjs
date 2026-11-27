// `pnpm check:lesson <slug>`: every check a lesson pull request needs, in one run, ending in a
// markdown block to paste into the pull request (docs/ADDING_A_LESSON.md, "The checks").
//
//   pnpm check:lesson state-ownership
//   pnpm check:lesson state-ownership --skip lighthouse,storybook   # while iterating
//
// It runs, in order: lint, types, formatting, the unit tests, the build, the JavaScript budget, the
// end-to-end tests that cover the lesson (its own spec, the shared lesson checks filtered to it, and
// the specs that read every ready lesson), the Storybook build, and Lighthouse on the lesson page.
// A failing check does not stop the run, so one run shows everything that is wrong; the checks that
// need the build are skipped if the build fails. Each step's output is saved under
// `.lesson-checks/<slug>/`, with `report.md`, the block to paste. Exit code 1 if any check failed.
//
// On a Mac it keeps the machine awake while it runs (`caffeinate`, which exits with this process).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  markdownReport,
  parseLighthouse,
  parsePlaywright,
  parseVitest,
  stripAnsi,
  sumPlaywright,
  tail,
} from './check-lesson-lib.mjs';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const skipArg = args.find((a) => a.startsWith('--skip'));
const skipValue = skipArg?.includes('=') ? skipArg.split('=')[1] : args[args.indexOf('--skip') + 1];
const skip = new Set(skipArg ? (skipValue ?? '').split(',').filter(Boolean) : []);

if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(
    'Usage: pnpm check:lesson <slug> [--skip lint,types,format,unit,build,budget,e2e,storybook,lighthouse]',
  );
  process.exit(2);
}
const page = join('src', 'app', '(site)', 'lessons', slug, 'page.tsx');
for (const file of [join('content', 'lessons', `${slug}.ts`), page]) {
  if (!existsSync(file)) {
    console.error(`${slug} is not a lesson: ${file} does not exist.`);
    process.exit(2);
  }
}

const dir = join('.lesson-checks', slug);
mkdirSync(dir, { recursive: true });

// Keep the Mac awake until this process exits: -d display, -i idle, -m disk, -s system (on power).
let caffeinated = false;
if (process.platform === 'darwin') {
  const probe = spawnSync('which', ['caffeinate'], { encoding: 'utf8' });
  if (probe.status === 0) {
    spawn('caffeinate', ['-dims', '-w', String(process.pid)], { stdio: 'ignore' }).unref();
    caffeinated = true;
  }
}
console.log(
  `Checking ${slug}. ${caffeinated ? 'Keeping the Mac awake (caffeinate).' : 'caffeinate is not available: the Mac may sleep during the run.'}\n`,
);

/** Runs a command, saves its output, returns `{ ok, output, seconds }`. */
function run(name, command, commandArgs, env = {}) {
  const started = Date.now();
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 256 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  writeFileSync(join(dir, `${name}.log`), stripAnsi(output));
  return {
    ok: result.status === 0,
    output,
    seconds: Math.round((Date.now() - started) / 1000),
  };
}

const steps = [];
const extra = { budgetTable: null, lighthouse: [] };

/** Records a step, prints one line, and shows the end of the output if it failed. */
function record(name, status, detail, seconds, output) {
  steps.push({ name, status, detail, seconds });
  const mark = { ok: 'ok     ', fail: 'FAILED ', skipped: 'skipped' }[status];
  console.log(`${mark} ${name.padEnd(34)} ${detail ?? ''}${seconds ? ` (${seconds} s)` : ''}`);
  if (status === 'fail' && output) console.log(`\n${tail(output)}\n`);
}

/** Runs one named step, unless it was skipped or what it needs failed. */
function step(key, name, needs, body) {
  const missing = needs.find((n) => steps.find((s) => s.key === n)?.status === 'fail');
  if (skip.has(key)) record(name, 'skipped', 'skipped with --skip');
  else if (missing) record(name, 'skipped', `needs ${missing}, which failed`);
  else body();
  steps.at(-1).key = key;
}

const simple = (key, name, command, commandArgs, summarize) =>
  step(key, name, [], () => {
    const r = run(key, command, commandArgs);
    record(name, r.ok ? 'ok' : 'fail', summarize?.(r.output, r.ok) ?? '', r.seconds, r.output);
  });

simple('lint', 'Lint', 'pnpm', ['lint']);
simple('types', 'Type check', 'pnpm', ['typecheck']);
simple('format', 'Formatting', 'pnpm', ['format:check']);
simple('unit', 'Unit tests', 'pnpm', ['test'], (out) => {
  const { files, tests } = parseVitest(out);
  return files && tests ? `${tests}; ${files} files` : '';
});
simple('build', 'Build (static export)', 'pnpm', ['build']);

step('budget', 'JavaScript budget', ['build'], () => {
  const r = run('budget', 'node', ['scripts/js-budget.mjs']);
  const table = stripAnsi(r.output)
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .join('\n');
  extra.budgetTable = table || null;
  const row = table.split('\n').find((line) => line.includes(`\`/lessons/${slug}/\``));
  const size = row?.split('|')[2]?.trim();
  const problems = stripAnsi(r.output)
    .split('\n')
    .filter((line) => line.startsWith('FAIL:'));
  record(
    'JavaScript budget',
    r.ok ? 'ok' : 'fail',
    r.ok ? `lesson page ${size ?? '?'} gzipped (limit 150 KB)` : problems.join(' '),
    r.seconds,
    r.output,
  );
});

step('e2e', 'End-to-end tests', ['build'], () => {
  // The lesson's own spec (lessons 1 and 2 share one), the shared lesson checks narrowed to it, and
  // the specs that read every ready lesson from the catalog.
  const own = readdirSync('e2e').filter((f) =>
    new RegExp(`^lesson-\\d+-${slug}\\.spec\\.ts$`).test(f),
  );
  const ownFiles = (own.length ? own : ['lessons.spec.ts', 'player.spec.ts']).map(
    (f) => `e2e/${f}`,
  );
  const everyLesson = ['step-card', 'layout-shift', 'metric-labels', 'shell'].map(
    (f) => `e2e/${f}.spec.ts`,
  );
  const runs = [
    ['own', ownFiles],
    ['shared', ['e2e/lesson-shared.spec.ts', '-g', `for ${slug}\\b`]],
    ['all', everyLesson],
  ];
  const totals = [];
  let okAll = true;
  let output = '';
  let seconds = 0;
  for (const [label, files] of runs) {
    const json = join(dir, `e2e-${label}.json`);
    const r = run(
      `e2e-${label}`,
      'pnpm',
      ['exec', 'playwright', 'test', ...files, '--reporter=list,json'],
      {
        PLAYWRIGHT_JSON_OUTPUT_NAME: json,
      },
    );
    okAll &&= r.ok;
    output += r.output;
    seconds += r.seconds;
    totals.push(existsSync(json) ? parsePlaywright(JSON.parse(readFileSync(json, 'utf8'))) : null);
  }
  const sum = sumPlaywright(totals.filter(Boolean));
  const detail =
    `${sum.passed} passed` +
    (sum.failed ? `, ${sum.failed} failed` : '') +
    (sum.flaky ? `, ${sum.flaky} flaky` : '') +
    (sum.skipped ? `, ${sum.skipped} skipped` : '') +
    ` (the lesson's spec, the shared checks for it, and the specs over every lesson)`;
  record(
    'End-to-end tests',
    okAll && totals.every(Boolean) ? 'ok' : 'fail',
    detail,
    seconds,
    output,
  );
});

simple('storybook', 'Storybook build', 'pnpm', ['build-storybook']);

step('lighthouse', 'Lighthouse', ['build'], () => {
  const r = run('lighthouse', 'pnpm', ['lighthouse'], { LIGHTHOUSE_LESSON: slug });
  extra.lighthouse = parseLighthouse(r.output);
  const mine = extra.lighthouse.find((l) => l.path === `/lessons/${slug}/`);
  const detail = mine
    ? `lesson page: performance ${mine.performance}, accessibility ${mine.accessibility}, best practices ${mine.bestPractices}, LCP ${mine.lcp} s, CLS ${mine.cls}`
    : 'no numbers for the lesson page';
  record('Lighthouse', r.ok && mine ? 'ok' : 'fail', detail, r.seconds, r.output);
});

const git = (...a) => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim();
const dirty = git('status', '--porcelain') !== '';
const report = markdownReport({
  slug,
  branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  commit: `${git('rev-parse', '--short', 'HEAD')}${dirty ? ' + uncommitted changes' : ''}`,
  steps,
  budgetTable: extra.budgetTable,
  lighthouse: extra.lighthouse,
  caffeinated,
});
writeFileSync(join(dir, 'report.md'), report);
console.log(`\n${'-'.repeat(72)}\n${report}${'-'.repeat(72)}`);
console.log(`Saved to ${join(dir, 'report.md')}; each step's output is next to it.`);
process.exit(steps.some((s) => s.status === 'fail') ? 1 : 0);
