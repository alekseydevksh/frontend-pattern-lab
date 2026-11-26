// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The JavaScript budget script, run as CI runs it, against small fake exports. Random bytes do not
 * compress, so a file of N bytes is about N bytes gzipped. Each export comes with a fake `.next`
 * holding a client reference manifest per lesson page, which names the page's scene, and the scene's
 * module is written into a script file the way the bundler writes it (`,<id>,e=>{`).
 */

const script = join(__dirname, 'js-budget.mjs');
const KB = 1024;
const made: string[] = [];

/** A scene module in a manifest: its file name and its module id. */
type FakeScene = { file: string; id: number };

/**
 * Where the scenes are, when a test sets them. `manifests`: the scenes each lesson page's manifest
 * lists, by slug (a slug left out has no manifest). `defines`: the scene module ids a script file
 * holds. `names`: the other script files a script file names, as a dynamic import does.
 */
interface SceneSetup {
  manifests: Record<string, FakeScene[]>;
  defines?: Record<string, number[]>;
  names?: Record<string, string[]>;
}

/** The scene each lesson page renders when a test does not say: `<Slug>Scene.tsx`, id 9000 + n. */
function defaultScenes(pages: Record<string, string[]>): SceneSetup {
  const setup: Required<SceneSetup> = { manifests: {}, defines: {}, names: {} };
  Object.entries(pages)
    .filter(([file]) => file.startsWith('lessons/'))
    .forEach(([file, scripts], index) => {
      const slug = file.split('/')[1]!;
      const scene = {
        file: `${slug[0]!.toUpperCase()}${slug.slice(1)}Scene.tsx`,
        id: 9000 + index,
      };
      setup.manifests[slug] = [scene];
      // The page's last script holds its scene, as a lesson page's own chunk does.
      const last = scripts.at(-1);
      if (last) setup.defines[last] = [...(setup.defines[last] ?? []), scene.id];
    });
  return setup;
}

/** A client reference manifest as Next.js writes it, listing these scenes and one other module. */
function manifestOf(slug: string, scenes: FakeScene[]) {
  const modules: Record<string, { id: number; name: string; chunks: string[]; async: boolean }> = {
    '[project]/src/app/(site)/lessons/LessonRoute.tsx': {
      id: 1,
      name: '*',
      chunks: [],
      async: false,
    },
  };
  for (const s of scenes) {
    modules[`[project]/src/components/scenes/${s.file}`] = {
      id: s.id,
      name: '*',
      chunks: [],
      async: false,
    };
  }
  const key = `/(site)/lessons/${slug}/page`;
  return (
    'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\n' +
    `globalThis.__RSC_MANIFEST[${JSON.stringify(key)}] = ${JSON.stringify({ moduleLoading: { prefix: '' }, clientModules: modules })};`
  );
}

/**
 * Writes an export: pages (path to scripts), the script files they use (path to size), and the
 * build's manifests in `.next` (see `SceneSetup`; by default, each lesson page has a scene of its own).
 */
function exportOf(
  pages: Record<string, string[]>,
  files: Record<string, number>,
  extra = '',
  scenes: SceneSetup = defaultScenes(pages),
) {
  const dir = mkdtempSync(join(tmpdir(), 'js-budget-'));
  made.push(dir);
  const write = (path: string, content: string | Buffer) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  };
  for (const [path, size] of Object.entries(files)) {
    const modules = (scenes.defines?.[path] ?? []).map((id) => `,${id},e=>{}`).join('');
    const named = (scenes.names?.[path] ?? []).map((f) => `"${f}"`).join(',');
    write(path, Buffer.concat([Buffer.from(`[0${modules}];[${named}];`), randomBytes(size)]));
  }
  for (const [file, scripts] of Object.entries(pages)) {
    const tags = scripts.map((src) => `<script src="/${src}" async></script>`).join('');
    write(file, `<html><body>${tags}${extra}</body></html>`);
  }
  for (const [slug, listed] of Object.entries(scenes.manifests)) {
    write(
      `.next/server/app/(site)/lessons/${slug}/page_client-reference-manifest.js`,
      manifestOf(slug, listed),
    );
  }
  return dir;
}

function run(dir: string, args: string[] = []) {
  const result = spawnSync('node', [script, ...args], {
    env: { ...process.env, OUT_DIR: dir, NEXT_DIR: join(dir, '.next') },
    encoding: 'utf8',
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const framework = { '_next/static/framework.js': 100 * KB };
const lessonPages = {
  'index.html': ['_next/static/framework.js'],
  'lessons/alpha/index.html': ['_next/static/framework.js', '_next/static/alpha.js'],
  'lessons/beta/index.html': ['_next/static/framework.js', '_next/static/beta.js'],
};

describe('scripts/js-budget.mjs', () => {
  it('passes when every lesson page is under the limit and has a file of its own', () => {
    const dir = exportOf(lessonPages, {
      ...framework,
      '_next/static/alpha.js': 2 * KB,
      '_next/static/beta.js': 3 * KB,
    });
    const { code, out } = run(dir);
    expect(out).toContain('/lessons/alpha/');
    expect(out).toContain('/lessons/beta/');
    expect(out).toContain('JavaScript budget: ok');
    expect(code).toBe(0);
  });

  it('fails a lesson page over 150 KB, and names the page', () => {
    const dir = exportOf(lessonPages, {
      ...framework,
      '_next/static/alpha.js': 2 * KB,
      '_next/static/beta.js': 60 * KB,
    });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL: \/lessons\/beta\/ loads 16\d\.\d KB .* over its 150 KB limit/);
    expect(out).not.toMatch(/FAIL: \/lessons\/alpha\//);
  });

  it('fails a catalog over 145 KB, and passes one under it', () => {
    const lessons = {
      'lessons/alpha/index.html': ['_next/static/alpha.js'],
      'lessons/beta/index.html': ['_next/static/beta.js'],
    };
    const files = { '_next/static/alpha.js': 1 * KB, '_next/static/beta.js': 1 * KB };
    const under = exportOf(
      { ...lessons, 'index.html': ['_next/static/catalog.js'] },
      { ...files, '_next/static/catalog.js': 143 * KB },
    );
    expect(run(under).code).toBe(0);
    const over = exportOf(
      { ...lessons, 'index.html': ['_next/static/catalog.js'] },
      { ...files, '_next/static/catalog.js': 147 * KB },
    );
    const { code, out } = run(over);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL: \/ loads 14\d\.\d KB .* over its 145 KB limit/);
  });

  it('measures a lesson that is not listed anywhere: any folder in lessons/ is a lesson page', () => {
    const dir = exportOf(
      {
        ...lessonPages,
        'lessons/gamma/index.html': ['_next/static/framework.js', '_next/static/gamma.js'],
      },
      {
        ...framework,
        '_next/static/alpha.js': 1 * KB,
        '_next/static/beta.js': 1 * KB,
        '_next/static/gamma.js': 80 * KB,
      },
    );
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain('FAIL: /lessons/gamma/');
  });

  it('passes a page just under the limit and fails one just over it', () => {
    const under = exportOf(
      { 'index.html': [], 'lessons/a/index.html': ['_next/static/a.js'] },
      { '_next/static/a.js': 149 * KB },
    );
    expect(run(under).code).toBe(0);
    const over = exportOf(
      { 'index.html': [], 'lessons/a/index.html': ['_next/static/a.js'] },
      { '_next/static/a.js': 152 * KB },
    );
    expect(run(over).code).toBe(1);
  });

  it('fails when two lesson pages load exactly the same files: the scenes are bundled together', () => {
    const dir = exportOf(
      {
        'index.html': ['_next/static/framework.js'],
        'lessons/alpha/index.html': ['_next/static/framework.js', '_next/static/scenes.js'],
        'lessons/beta/index.html': ['_next/static/framework.js', '_next/static/scenes.js'],
      },
      { ...framework, '_next/static/scenes.js': 5 * KB },
    );
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain('FAIL: /lessons/alpha/ has no JavaScript file of its own');
    expect(out).toContain('FAIL: /lessons/beta/ has no JavaScript file of its own');
  });

  it('does not ask a single lesson page for a file of its own', () => {
    const dir = exportOf(
      { 'index.html': [], 'lessons/only/index.html': ['_next/static/only.js'] },
      { '_next/static/only.js': 5 * KB },
    );
    expect(run(dir).code).toBe(0);
  });

  it('fails when the export has no lesson page at all', () => {
    const dir = exportOf({ 'index.html': ['_next/static/framework.js'] }, framework);
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain('No lesson page found');
  });

  it('counts a preloaded script, and ignores the nomodule polyfill', () => {
    const dir = exportOf(
      { 'index.html': [], 'lessons/a/index.html': ['_next/static/a.js'] },
      {
        '_next/static/a.js': 10 * KB,
        '_next/static/preloaded.js': 145 * KB,
        '_next/static/poly.js': 200 * KB,
      },
      '<link rel="preload" as="script" href="/_next/static/preloaded.js"/>' +
        '<script src="/_next/static/poly.js" nomodule></script>',
    );
    const { code, out } = run(dir, ['--json']);
    const [, lesson] = JSON.parse(out).routes;
    expect(lesson.files).toBe(2); // a.js and the preloaded file, not the polyfill
    expect(lesson.gzip).toBeGreaterThan(150 * KB);
    expect(code).toBe(1);
  });

  it('reports the sizes as JSON, with the part of each page that is its own', () => {
    const dir = exportOf(lessonPages, {
      ...framework,
      '_next/static/alpha.js': 2 * KB,
      '_next/static/beta.js': 3 * KB,
    });
    const { code, out } = run(dir, ['--json']);
    const report = JSON.parse(out);
    expect(code).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.routes.map((r: { path: string }) => r.path)).toEqual([
      '/',
      '/lessons/alpha/',
      '/lessons/beta/',
    ]);
    const [catalog, alpha] = report.routes;
    expect(catalog.limit).toBe(145 * KB);
    expect(alpha.limit).toBe(150 * KB);
    expect(alpha.ownFiles).toBe(1);
    expect(alpha.ownGzip).toBeGreaterThan(2 * KB - 100);
    expect(alpha.ownGzip).toBeLessThan(2 * KB + 100);
    expect(catalog.scene).toBeNull();
    expect(alpha.scene).toBe('AlphaScene.tsx');
  });

  it('exits non-zero with a clear message when there is no export', () => {
    const { code, out } = run(join(tmpdir(), 'no-such-export-dir'));
    expect(code).toBe(1);
    expect(out).toContain('Run `pnpm build` first');
  });
});

describe('scripts/js-budget.mjs: each lesson page carries its own scene and no other (D16)', () => {
  const alpha = { file: 'AlphaScene.tsx', id: 101 };
  const beta = { file: 'BetaScene.tsx', id: 202 };
  const pages = {
    'index.html': ['_next/static/chunks/framework.js'],
    'lessons/alpha/index.html': [
      '_next/static/chunks/framework.js',
      '_next/static/chunks/alpha.js',
    ],
    'lessons/beta/index.html': ['_next/static/chunks/framework.js', '_next/static/chunks/beta.js'],
  };
  const files = {
    '_next/static/chunks/framework.js': 50 * KB,
    '_next/static/chunks/alpha.js': 2 * KB,
    '_next/static/chunks/beta.js': 2 * KB,
  };
  const manifests = { alpha: [alpha], beta: [beta] };

  it('passes when each lesson page holds its own scene, and names it in the report', () => {
    const dir = exportOf(pages, files, '', {
      manifests,
      defines: { '_next/static/chunks/alpha.js': [101], '_next/static/chunks/beta.js': [202] },
    });
    const { code, out } = run(dir);
    expect(out).toMatch(/\/lessons\/alpha\/ .*scene AlphaScene/);
    expect(out).toMatch(/\/lessons\/beta\/ .*scene BetaScene/);
    expect(code).toBe(0);
  });

  it("fails a lesson page that includes another lesson's scene, and names the scene and the file", () => {
    const dir = exportOf(pages, files, '', {
      manifests,
      defines: {
        '_next/static/chunks/framework.js': [202], // beta's scene, in a file every page loads
        '_next/static/chunks/alpha.js': [101],
        '_next/static/chunks/beta.js': [202],
      },
    });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain(
      "FAIL: /lessons/alpha/ includes another lesson's scene, BetaScene.tsx (in /_next/static/chunks/framework.js).",
    );
    expect(out).toContain('FAIL: / includes a scene, BetaScene.tsx');
    expect(out).not.toMatch(/FAIL: \/lessons\/beta\//);
  });

  it("fails a lesson page that names a file holding another lesson's scene, as a registry of loaders does", () => {
    const dir = exportOf(pages, files, '', {
      manifests,
      defines: { '_next/static/chunks/alpha.js': [101], '_next/static/chunks/beta.js': [202] },
      names: { '_next/static/chunks/alpha.js': ['static/chunks/beta.js'] },
    });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain(
      "FAIL: /lessons/alpha/ can load another lesson's scene, BetaScene.tsx: /_next/static/chunks/alpha.js names the file that holds it.",
    );
  });

  it('fails a lesson page whose page does not import a scene, or imports two', () => {
    const none = exportOf(pages, files, '', {
      manifests: { alpha: [], beta: [beta] },
      defines: { '_next/static/chunks/beta.js': [202] },
    });
    const first = run(none);
    expect(first.code).toBe(1);
    expect(first.out).toContain(
      'FAIL: /lessons/alpha/ should render one scene, imported by its page (D16), but its client reference manifest lists none.',
    );
    const two = exportOf(pages, files, '', {
      manifests: { alpha: [alpha, beta], beta: [beta] },
      defines: { '_next/static/chunks/alpha.js': [101], '_next/static/chunks/beta.js': [202] },
    });
    expect(run(two).out).toContain('lists AlphaScene.tsx, BetaScene.tsx');
  });

  it('fails a lesson page that does not hold its own scene, because the check could not see it', () => {
    const dir = exportOf(pages, files, '', {
      manifests,
      defines: { '_next/static/chunks/beta.js': [202] },
    });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toContain('FAIL: /lessons/alpha/ does not include its own scene, AlphaScene.tsx');
  });

  it('fails when the build has no manifest for a lesson page', () => {
    const dir = exportOf(pages, files, '', {
      manifests: { beta: [beta] },
      defines: { '_next/static/chunks/beta.js': [202] },
    });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toMatch(
      /FAIL: \/lessons\/alpha\/ has no client reference manifest .* Run `pnpm build` first/,
    );
  });
});
