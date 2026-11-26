// Measures the JavaScript each page loads, gzipped, from the static export in out/, and fails
// if a lesson page goes over its budget. No dependencies: it reads the <script> tags of the
// built HTML and compresses each file with node:zlib, as a host would on the wire.
//
//   node scripts/js-budget.mjs            # report and check
//   node scripts/js-budget.mjs --json     # machine-readable
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const out = resolve(process.env.OUT_DIR ?? 'out');
const KB = 1024;

/** Pages to measure, and the most gzipped JavaScript each may load. null = report only. */
const pages = [
  { path: '/', file: 'index.html', budget: null, label: 'catalog' },
  {
    path: '/lessons/optimistic-ui/',
    file: 'lessons/optimistic-ui/index.html',
    budget: 150 * KB,
    label: 'lesson',
  },
  {
    path: '/lessons/push-pull-sync/',
    file: 'lessons/push-pull-sync/index.html',
    budget: 150 * KB,
    label: 'lesson',
  },
];

if (!existsSync(out)) {
  console.error(`No export found at ${out}. Run \`pnpm build\` first.`);
  process.exit(1);
}

/** Every script file a browser fetches for a page (blocking, async and preloaded), once each. */
function scriptsOf(html) {
  const found = new Set();
  for (const tag of html.match(/<(script|link)\b[^>]*>/g) ?? []) {
    // A nomodule script is Next.js's polyfill for old browsers, which no current browser fetches.
    if (/\bnomodule\b/i.test(tag)) continue;
    if (tag.startsWith('<link') && !/rel="preload"/.test(tag)) continue;
    if (tag.startsWith('<link') && !/as="script"/.test(tag)) continue;
    const src = /(?:src|href)="([^"]+\.js[^"]*)"/.exec(tag)?.[1];
    if (src && src.startsWith('/')) found.add(src.split('?')[0]);
  }
  return [...found];
}

const results = pages.map((page) => {
  const html = readFileSync(join(out, page.file), 'utf8');
  const files = scriptsOf(html).map((src) => {
    const bytes = readFileSync(join(out, src));
    return { src, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
  });
  const gzip = files.reduce((sum, f) => sum + f.gzip, 0);
  return { ...page, files, gzip, ok: page.budget === null || gzip <= page.budget };
});

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      results.map(({ path, label, gzip, budget, ok }) => ({ path, label, gzip, budget, ok })),
      null,
      2,
    ),
  );
} else {
  for (const r of results) {
    const limit = r.budget === null ? 'no limit' : `limit ${(r.budget / KB).toFixed(0)} KB`;
    console.log(
      `${r.path.padEnd(28)} ${(r.gzip / KB).toFixed(1).padStart(6)} KB gzipped JS in ${r.files.length} files (${limit})${r.ok ? '' : '  OVER BUDGET'}`,
    );
  }
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
