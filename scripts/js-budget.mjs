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
// These fail the check:
//  1. a lesson page that loads more than LESSON_LIMIT of gzipped JavaScript (docs/SPEC.md, "Starting
//     performance budget": under 150 KB);
//  2. the catalog loading more than CATALOG_LIMIT (145 KB, set by the owner in M5: the framework alone
//     is about 139 KB, so this catches the catalog starting to load lesson code; see D15);
//  3. a lesson page with no JavaScript file of its own, when there are two or more lesson pages. A
//     lesson's scene is loaded on demand (D14), so each page must load a file that no other lesson
//     page loads; if none does, the scenes have been bundled together again, and every page pays
//     for all of them;
//  4. a lesson page that includes another lesson's scene, or names a file that holds one (so it could
//     load it later), or does not include its own; and the catalog including or naming any scene.
//     Each lesson page imports its own scene (D16). The scenes and their module ids come from the
//     build's client reference manifests in .next (`NEXT_DIR`): a lesson page's manifest names the
//     scene it renders, `src/components/scenes/<Name>Scene.tsx`. The check then looks for each
//     scene's module in the JavaScript a page loads, where the bundler writes it as `,<id>,e=>{`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const out = resolve(process.env.OUT_DIR ?? 'out');
const nextDir = resolve(process.env.NEXT_DIR ?? '.next');
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
    return {
      src,
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      text: bytes.toString('latin1'),
    };
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

// Which scene each lesson page renders, from the build's client reference manifests.
/** A scene file in a client reference manifest; the dev scene is not a lesson's. */
const SCENE_FILE = /\/src\/components\/scenes\/([^/]+Scene\.tsx)$/;

/** Every `lessons/<slug>/page_client-reference-manifest.js` under .next/server/app, by slug. */
function lessonManifests(dir) {
  const found = new Map();
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === 'page_client-reference-manifest.js') {
        const parts = relative(dir, path).split(/[\\/]/);
        if (parts.length >= 3 && parts.at(-3) === 'lessons') found.set(parts.at(-2), path);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return found;
}

/** The scene modules a manifest lists: `{ file, id }`, where `file` is the scene's file name. */
function scenesInManifest(path) {
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('] = {');
  if (start === -1) return [];
  const manifest = JSON.parse(
    text
      .slice(start + 4)
      .trim()
      .replace(/;$/, ''),
  );
  return Object.entries(manifest.clientModules ?? {}).flatMap(([key, value]) => {
    const file = SCENE_FILE.exec(key)?.[1];
    return file ? [{ file, id: String(value.id) }] : [];
  });
}

/** Whether a JavaScript file defines the module with this id (`[` or `,`, the id, `,`, a function). */
function defines(text, id) {
  return new RegExp(`[\\[,]${id},(?:[\\w$]+=>|\\(|function\\b)`).test(text);
}

const manifests = lessonManifests(join(nextDir, 'server', 'app'));
/** Every lesson's scene, by file name. */
const scenes = new Map();
for (const page of lessonPages) {
  const slug = page.path.split('/').at(-2);
  const manifest = manifests.get(slug);
  if (!manifest) {
    problems.push(
      `${page.path} has no client reference manifest in ${nextDir} (lessons/${slug}/` +
        `page_client-reference-manifest.js), so its scene cannot be checked. Run \`pnpm build\` first.`,
    );
    continue;
  }
  const listed = scenesInManifest(manifest);
  if (listed.length !== 1) {
    problems.push(
      `${page.path} should render one scene, imported by its page (D16), but its client reference ` +
        `manifest lists ${listed.length === 0 ? 'none' : listed.map((s) => s.file).join(', ')}.`,
    );
  }
  page.scene = listed.length === 1 ? listed[0] : null;
  for (const scene of listed) scenes.set(scene.file, scene);
}

// The script files in the export that hold each scene, to catch a page that names one of them.
const chunksDir = join(out, '_next', 'static', 'chunks');
const chunkFiles = existsSync(chunksDir)
  ? readdirSync(chunksDir).filter((f) => f.endsWith('.js'))
  : [];
const sceneChunks = [...scenes.values()].map((scene) => ({
  ...scene,
  chunks: chunkFiles.filter((f) => defines(readFileSync(join(chunksDir, f), 'latin1'), scene.id)),
}));

for (const route of routes) {
  const own = route.scene?.file ?? null;
  for (const scene of sceneChunks) {
    if (scene.file === own) continue;
    const holder = route.files.find((f) => defines(f.text, scene.id));
    const namer = route.files.find((f) => scene.chunks.some((c) => f.text.includes(c)));
    const whose = route.label === 'catalog' ? 'a scene' : "another lesson's scene";
    if (holder) {
      problems.push(`${route.path} includes ${whose}, ${scene.file} (in ${holder.src}).`);
    } else if (namer) {
      problems.push(
        `${route.path} can load ${whose}, ${scene.file}: ${namer.src} names the file that holds it.`,
      );
    }
  }
  if (own && !route.files.some((f) => defines(f.text, route.scene.id))) {
    problems.push(
      `${route.path} does not include its own scene, ${own}, in the files it loads, so the check ` +
        `cannot see which scenes it carries.`,
    );
  }
}

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      {
        ok: problems.length === 0,
        problems,
        routes: routes.map(({ path, label, gzip, limit, files, own, ownGzip, scene }) => ({
          path,
          label,
          gzip,
          limit,
          files: files.length,
          ownFiles: own?.length ?? null,
          ownGzip: ownGzip ?? null,
          scene: scene?.file ?? null,
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
    const scene = r.scene ? `, scene ${basename(r.scene.file, '.tsx')}` : '';
    console.log(
      `${r.path.padEnd(28)} ${kb(r.gzip)} KB gzipped JS in ${r.files.length} files${own}${scene} ` +
        `(${limit})${r.over ? '  OVER BUDGET' : ''}`,
    );
  }
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  if (problems.length === 0) console.log('JavaScript budget: ok');
}
process.exit(problems.length === 0 ? 0 : 1);
