import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The catalog and shell components are documented components: each has a story file with a
 * side-by-side light and dark story, like the ones in components/ui and components/lesson.
 * (SiteShell only arranges the header and footer, which have stories of their own.)
 */
const documented = [
  'catalog/LessonCard',
  'catalog/ProgressNote',
  'shell/SiteHeader',
  'shell/SiteFooter',
];

describe('Storybook coverage of the catalog and shell components', () => {
  it.each(documented)('%s has a story file with a side-by-side light and dark story', (name) => {
    const file = join(__dirname, `${name}.stories.tsx`);
    expect(existsSync(file), `${name}.stories.tsx exists`).toBe(true);
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/export const BothThemes\b/);
    expect(source).toMatch(/<ThemePair[ >]/);
  });
});
