import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The player's controls are documented components: each has a story file with a side-by-side
 * light and dark story. (Diagram and PacketLayer are drawing parts of the player, covered by
 * the end-to-end test on /dev/player/.)
 */
const documented = ['StepControls', 'PlayerControls'];

describe('Storybook coverage of the player controls', () => {
  it.each(documented)('%s has a story file with a side-by-side light and dark story', (name) => {
    const file = join(__dirname, `${name}.stories.tsx`);
    expect(existsSync(file), `${name}.stories.tsx exists`).toBe(true);
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/export const BothThemes\b/);
    expect(source).toContain('<ThemePair>');
  });
});
