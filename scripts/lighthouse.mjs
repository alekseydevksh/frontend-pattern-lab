// `pnpm lighthouse`: runs Lighthouse CI on the static export (see lighthouserc.cjs), prints the
// numbers of each page's median run, then checks the JavaScript budget (scripts/js-budget.mjs; CI
// also runs it as a step of its own, `pnpm budget`).
// Exits non-zero if any budget is missed. Run `pnpm build` first.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

if (!existsSync('out')) {
  console.error('No export found at out/. Run `pnpm build` first.');
  process.exit(1);
}

// Use the browser Playwright already installed, so there is nothing else to download.
// A CHROME_PATH set by the caller (for example in CI) wins.
const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? chromium.executablePath() };

rmSync('.lighthouseci', { recursive: true, force: true });
const lhci = spawnSync('pnpm', ['exec', 'lhci', 'autorun'], { stdio: 'inherit', env });

// Summary of the median run for each URL.
const dir = '.lighthouseci';
const reports = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => /^lhr-.*\.json$/.test(f))
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  : [];
const byUrl = Map.groupBy(reports, (r) => r.finalUrl);
const median = (list, pick) =>
  [...list].map(pick).sort((a, b) => a - b)[Math.floor(list.length / 2)];
const audit = (r, id) => r.audits[id]?.numericValue ?? 0;

console.log('\nLighthouse, mobile profile, median of 5 runs');
for (const [url, runs] of byUrl) {
  const score = (c) => Math.round(median(runs, (r) => r.categories[c].score) * 100);
  console.log(
    `${new URL(url).pathname.padEnd(28)}` +
      ` performance ${score('performance')}` +
      ` · accessibility ${score('accessibility')}` +
      ` · best practices ${score('best-practices')}` +
      ` · LCP ${(median(runs, (r) => audit(r, 'largest-contentful-paint')) / 1000).toFixed(2)} s` +
      ` · CLS ${median(runs, (r) => audit(r, 'cumulative-layout-shift')).toFixed(3)}` +
      ` · TBT ${Math.round(median(runs, (r) => audit(r, 'total-blocking-time')))} ms`,
  );
}

console.log('');
const budget = spawnSync('node', ['scripts/js-budget.mjs'], { stdio: 'inherit' });
process.exit(lhci.status === 0 && budget.status === 0 ? 0 : 1);
