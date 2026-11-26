// The JavaScript budget: measures the JavaScript each route loads, gzipped, from the static export
// in out/, and exits non-zero if a lesson page goes over its limit. It runs in CI as its own step
// (`pnpm budget`) and again at the end of `pnpm lighthouse`. No dependencies: it reads the
// <script> and preload tags of the built HTML and compresses each file with node:zlib, as a host
// would on the wire.
//
//   node scripts/js-budget.mjs            # report and check
//   node scripts/js-budget.mjs --json     # machine-readable
//
// The routes are found in the export, not listed here: the catalog is `index.html`, and every
// `lessons/<slug>/index.html` is a lesson page, so a new lesson is measured the day it is added.
//
// Three things fail the check:
//  1. a lesson page that loads more than LESSON_LIMIT of gzipped JavaScript (docs/SPEC.md, "Starting
//     performance budget": under 150 KB);
//  2. the catalog loading more than CATALOG_LIMIT (145 KB, set by the owner in M5: the framework alone
//     is about 139 KB, so this catches the catalog starting to load lesson code; see D15);
//  3. a lesson page with no JavaScript file of its own, when there are two or more lesson pages. A
//     lesson's scene is loaded on demand (D14), so each page must load a file that no other lesson
//     page loads; if none does, the scenes have been bundled together again, and every page pays
//     for all of them.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const out = resolve(process.env.OUT_DIR ?? 'out');
const KB = 1024;
/** The most gzipped JavaScript a lesson page may load. */
const LESSON_LIMIT = 150 * KB;
/** The most gzipped JavaScript the catalog may load. */
const CATALOG_LIMIT = 145 * KB;

if (!existsSync(out)) {
  console.error(`No export found at ${out}. Run \`pnpm build\` first.`);
  process.exit(1);
}

/** The routes of the export: the catalog, and one page for each folder in lessons/. */
function routesOf(dir) {
  const routes = [{ path: '/', file: 'index.html', label: 'catalog', limit: CATALOG_LIMIT }];
  const lessonsDir = join(dir, 'lessons');
  const slugs = existsSync(lessonsDir)
    ? readdirSync(lessonsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(lessonsDir, e.name, 'index.html')))
        .map((e) => e.name)
        .sort()
    : [];
  for (const slug of slugs) {
    routes.push({
      path: `/lessons/${slug}/`,
      file: `lessons/${slug}/index.html`,
      label: 'lesson',
      limit: LESSON_LIMIT,
    });
  }
  return routes;
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

const routes = routesOf(out).map((route) => {
  const html = readFileSync(join(out, route.file), 'utf8');
  const files = scriptsOf(html).map((src) => {
    const bytes = readFileSync(join(out, src));
    return { src, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
  });
  return { ...route, files, gzip: files.reduce((sum, f) => sum + f.gzip, 0) };
});

const lessonPages = routes.filter((r) => r.label === 'lesson');
const problems = [];
if (lessonPages.length === 0) {
  problems.push('No lesson page found in the export (lessons/<slug>/index.html).');
}

for (const route of routes) {
  route.over = route.limit !== null && route.gzip > route.limit;
  if (route.over) {
    problems.push(
      `${route.path} loads ${(route.gzip / KB).toFixed(1)} KB of gzipped JavaScript, over its ` +
        `${(route.limit / KB).toFixed(0)} KB limit.`,
    );
  }
}

// The files a lesson page loads that no other lesson page loads: its scene, split off on demand.
const pagesLoading = new Map();
for (const page of lessonPages) {
  for (const file of page.files) {
    pagesLoading.set(file.src, (pagesLoading.get(file.src) ?? 0) + 1);
  }
}
for (const page of lessonPages) {
  page.own = page.files.filter((f) => pagesLoading.get(f.src) === 1);
  page.ownGzip = page.own.reduce((sum, f) => sum + f.gzip, 0);
  if (lessonPages.length >= 2 && page.own.length === 0) {
    problems.push(
      `${page.path} has no JavaScript file of its own: its scene is not split from the other ` +
        `lessons' (see D14).`,
    );
  }
}

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      {
        ok: problems.length === 0,
        problems,
        routes: routes.map(({ path, label, gzip, limit, files, own, ownGzip }) => ({
          path,
          label,
          gzip,
          limit,
          files: files.length,
          ownFiles: own?.length ?? null,
          ownGzip: ownGzip ?? null,
        })),
      },
      null,
      2,
    ),
  );
} else {
  const kb = (bytes) => (bytes / KB).toFixed(1).padStart(6);
  for (const r of routes) {
    const limit = `limit ${(r.limit / KB).toFixed(0)} KB`;
    const own = r.own ? `, ${kb(r.ownGzip)} KB of them its own (${r.own.length} files)` : '';
    console.log(
      `${r.path.padEnd(28)} ${kb(r.gzip)} KB gzipped JS in ${r.files.length} files${own} (${limit})` +
        `${r.over ? '  OVER BUDGET' : ''}`,
    );
  }
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  if (problems.length === 0) console.log('JavaScript budget: ok');
}
process.exit(problems.length === 0 ? 0 : 1);
