// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Who may import what around the scenes (D20). The shared scene module and the scene test helpers
 * are only useful if they cannot drag a lesson into another lesson's page:
 *
 *  - `sceneKit` is imported by scenes only, and imports no scene and no lesson data;
 *  - `sceneTest` is imported by tests only;
 *  - a scene imports no other scene and no lesson data (the lesson imports the scene's types, never
 *    the other way round), so a lesson page that carries its scene carries nothing of another lesson.
 *
 * `pnpm budget` checks the built pages for the same thing; this check fails earlier and says which
 * file and which import. The rule is a function over file names and sources, so the tests below can
 * run it on deliberately broken trees.
 */

const SCENES = 'src/components/scenes/';
const isScene = (file: string) =>
  /^src\/components\/scenes\/(?:dev\/)?[A-Za-z]+Scene\.tsx$/.test(file);
const isKit = (file: string) => file === `${SCENES}sceneKit.tsx`;
const isTest = (file: string) => /\.test\.tsx?$/.test(file);
const isSceneTest = (file: string) => isTest(file) && file.startsWith(SCENES);

/** The module names a source imports, with `import ... from`, `import '...'` and `import('...')`. */
function importsOf(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
}
/** The last path segment of a module name, without an extension. */
const leaf = (spec: string) =>
  spec
    .split('/')
    .at(-1)!
    .replace(/\.tsx?$/, '');
const names = (spec: string, wanted: string) => leaf(spec) === wanted;
const isLessonData = (spec: string) => /^@content\/|(?:^|\/)content\/lessons(?:\/|$)/.test(spec);

function boundaryProblems(files: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, source] of Object.entries(files)) {
    for (const spec of importsOf(source)) {
      if (names(spec, 'sceneKit') && !isScene(file) && !isKit(file) && !isSceneTest(file)) {
        problems.push(`${file} imports the shared scene module (${spec}); only scenes may.`);
      }
      if (names(spec, 'sceneTest') && !isTest(file)) {
        problems.push(`${file} imports the scene test helpers (${spec}); only tests may.`);
      }
      if (isScene(file) || isKit(file)) {
        if (leaf(spec) !== leaf(file) && /Scene$/.test(leaf(spec))) {
          problems.push(`${file} imports another scene (${spec}).`);
        }
        if (isLessonData(spec)) {
          problems.push(`${file} imports lesson data (${spec}); a scene is not tied to a lesson.`);
        }
        if (names(spec, 'sceneTest')) {
          problems.push(`${file} imports the scene test helpers (${spec}).`);
        }
      }
    }
  }
  return problems;
}

/** Every source file of the project that these rules apply to, by its path from the root. */
function projectFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|mts|mjs)$/.test(entry.name)) {
        files[relative(process.cwd(), path)] = readFileSync(path, 'utf8');
      }
    }
  };
  for (const root of ['src', 'content', 'e2e', 'scripts', '.storybook']) {
    try {
      walk(join(process.cwd(), root));
    } catch {
      // a folder that does not exist has nothing to check
    }
  }
  return files;
}

describe('scene import boundaries', () => {
  const real = projectFiles();

  it('holds across the project', () => {
    expect(Object.keys(real).filter(isScene).length).toBeGreaterThanOrEqual(7);
    expect(boundaryProblems(real)).toEqual([]);
  });

  it('sees the shared scene module being imported, so the check is not blind', () => {
    const users = Object.entries(real).filter(([file, source]) =>
      importsOf(source).some((spec) => names(spec, 'sceneKit') && file !== `${SCENES}sceneKit.tsx`),
    );
    expect(users.map(([file]) => file)).toContain(`${SCENES}sceneKit.test.tsx`);
  });

  it('fails a scene that imports another lesson’s scene', () => {
    const broken = {
      ...real,
      [`${SCENES}StateOwnershipScene.tsx`]: `import { x } from './VirtualizationScene';`,
    };
    expect(boundaryProblems(broken)).toEqual([
      `${SCENES}StateOwnershipScene.tsx imports another scene (./VirtualizationScene).`,
    ]);
    expect(
      boundaryProblems({ [`${SCENES}A.tsx`]: '', [`${SCENES}AScene.tsx`]: `import('./BScene')` }),
    ).toHaveLength(1);
  });

  it('fails a scene or the kit that imports lesson data', () => {
    expect(
      boundaryProblems({ [`${SCENES}AScene.tsx`]: `import { l } from '@content/lessons/b';` }),
    ).toHaveLength(1);
    expect(
      boundaryProblems({ [`${SCENES}sceneKit.tsx`]: `import { s } from './BScene';` }),
    ).toHaveLength(1);
  });

  it('fails the shared scene module imported from outside the scenes', () => {
    expect(
      boundaryProblems({
        'src/components/lesson/Player.tsx': `import { cap } from '../scenes/sceneKit';`,
      }),
    ).toHaveLength(1);
    expect(
      boundaryProblems({
        'content/lessons/a.ts': `import { cap } from '@/components/scenes/sceneKit';`,
      }),
    ).toHaveLength(1);
  });

  it('fails the test helpers imported by anything but a test', () => {
    expect(
      boundaryProblems({ [`${SCENES}AScene.tsx`]: `import { canonical } from './sceneTest';` }),
    ).toHaveLength(2);
    expect(
      boundaryProblems({
        'src/app/page.tsx': `import { canonical } from '@/components/scenes/sceneTest';`,
      }),
    ).toHaveLength(1);
    expect(
      boundaryProblems({
        [`${SCENES}AScene.test.tsx`]: `import { canonical } from './sceneTest';`,
      }),
    ).toEqual([]);
  });
});
