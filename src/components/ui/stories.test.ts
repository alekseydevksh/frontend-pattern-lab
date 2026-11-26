import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;

/** Component files: PascalCase .tsx files that are not stories or tests. */
const components = readdirSync(dir)
  .filter((file) => /^[A-Z][A-Za-z]+\.tsx$/.test(file))
  .map((file) => file.replace('.tsx', ''));

describe('Storybook coverage of components/ui', () => {
  it('finds the components', () => {
    expect(components.sort()).toEqual([
      'Button',
      'Card',
      'Chip',
      'Kbd',
      'MetricTile',
      'Pill',
      'ThemeToggle',
    ]);
  });

  it.each(components)('%s has a story file with a side-by-side light and dark story', (name) => {
    const file = join(dir, `${name}.stories.tsx`);
    expect(existsSync(file), `${name}.stories.tsx exists`).toBe(true);
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/export const BothThemes\b/);
    expect(source).toContain('<ThemePair>');
  });

  it('exports every component from the index', () => {
    const index = readFileSync(join(dir, 'index.ts'), 'utf8');
    for (const name of components) expect(index).toContain(`'./${name}'`);
  });
});
