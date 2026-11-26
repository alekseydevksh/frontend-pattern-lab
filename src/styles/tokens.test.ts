import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const tokens = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** Values from the colour table of the spec (the last row, --on-signal, was added in M3). */
const spec = {
  paper: ['#edf0f5', '#0c1426'],
  panel: ['#fafbfd', '#121d36'],
  ink: ['#16213a', '#e7ecf8'],
  muted: ['#59667f', '#97a5c3'],
  line: ['#c8d0de', '#2a3a5c'],
  grid: ['#dde3ed', '#15213d'],
  req: ['#e0562b', '#ff7d52'],
  res: ['#0d8587', '#38c3c5'],
  ev: ['#6c4fe0', '#a592ff'],
  bad: ['#c42248', '#ff6384'],
  'on-signal': ['#ffffff', '#0c1426'],
} as const;

function block(selectorStart: string): string {
  const start = tokens.indexOf(selectorStart);
  expect(start, `${selectorStart} block exists`).toBeGreaterThanOrEqual(0);
  return tokens.slice(start, tokens.indexOf('}', start));
}

describe('tokens.css', () => {
  const light = block(":root,\n[data-theme='light']");
  const dark = block("[data-theme='dark'] {");
  const systemDark = block(":root:not([data-theme='light'])");

  it.each(Object.entries(spec))(
    '%s has the spec value in both themes',
    (name, [lightValue, darkValue]) => {
      expect(light).toContain(`--${name}: ${lightValue};`);
      expect(dark).toContain(`--${name}: ${darkValue};`);
    },
  );

  it('uses the same dark values for the system preference and the explicit choice', () => {
    for (const [name, [, darkValue]] of Object.entries(spec)) {
      expect(systemDark).toContain(`--${name}: ${darkValue};`);
    }
  });

  it('derives the text variants of the signal colours inside every theme scope', () => {
    for (const tone of ['muted', 'req', 'res', 'ev', 'bad']) {
      expect(tokens).toMatch(new RegExp(`--${tone}-text: color-mix\\(in srgb, var\\(--${tone}\\)`));
    }
    // They must sit in a rule that matches [data-theme] scopes, or a themed wrapper
    // would inherit text colours computed from the page's theme.
    expect(tokens).toMatch(/:root,\s*\[data-theme\] \{\s*--muted-text/);
  });

  it('exposes the colours to Tailwind', () => {
    for (const name of Object.keys(spec)) {
      expect(tokens).toContain(`--color-${name}: var(--${name});`);
    }
  });
});

describe('no hard-coded colours outside the tokens', () => {
  const colour =
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(|\bcolor:\s*(?:white|black)\b/;

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(tsx?|css)$/.test(entry) && !/\.(test|stories)\./.test(entry) ? [path] : [];
    });
  }

  const files = [
    ...sourceFiles(join(root, 'src', 'components')),
    ...sourceFiles(join(root, 'src', 'app')),
    join(root, 'src', 'styles', 'globals.css'),
  ];

  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [relative(root, file), file]))('%s', (_name, file) => {
    expect(readFileSync(file as string, 'utf8')).not.toMatch(colour);
  });
});
