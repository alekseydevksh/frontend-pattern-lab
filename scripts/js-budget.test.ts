// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The JavaScript budget script, run as CI runs it, against small fake exports. Random bytes do not
 * compress, so a file of N bytes is about N bytes gzipped.
 */

const script = join(__dirname, 'js-budget.mjs');
const KB = 1024;
const made: string[] = [];

/** Writes an export: pages (path to scripts) and the script files they use (path to size). */
function exportOf(pages: Record<string, string[]>, files: Record<string, number>, extra = '') {
  const dir = mkdtempSync(join(tmpdir(), 'js-budget-'));
  made.push(dir);
  const write = (path: string, content: string | Buffer) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  };
  for (const [path, size] of Object.entries(files)) write(path, randomBytes(size));
  for (const [file, scripts] of Object.entries(pages)) {
    const tags = scripts.map((src) => `<script src="/${src}" async></script>`).join('');
    write(file, `<html><body>${tags}${extra}</body></html>`);
  }
  return dir;
}

function run(dir: string, args: string[] = []) {
  const result = spawnSync('node', [script, ...args], {
    env: { ...process.env, OUT_DIR: dir },
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
    expect(catalog.limit).toBeNull();
    expect(alpha.limit).toBe(150 * KB);
    expect(alpha.ownFiles).toBe(1);
    expect(alpha.ownGzip).toBeGreaterThan(2 * KB - 100);
    expect(alpha.ownGzip).toBeLessThan(2 * KB + 100);
  });

  it('exits non-zero with a clear message when there is no export', () => {
    const { code, out } = run(join(tmpdir(), 'no-such-export-dir'));
    expect(code).toBe(1);
    expect(out).toContain('Run `pnpm build` first');
  });
});
