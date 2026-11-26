import type { ReactNode } from 'react';

const themes = ['light', 'dark'] as const;

/**
 * Storybook helper: renders its children twice, side by side, once in each theme, so a
 * single story shows both. Each half sets its own data-theme, which redefines every token
 * for the elements inside it (see src/styles/tokens.css).
 */
export function ThemePair({
  children,
  stacked = false,
}: {
  children: ReactNode;
  /** One above the other instead of side by side, for content that needs the full width. */
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
      {themes.map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="rounded-card border-[1.5px] border-line bg-paper p-5 text-ink"
        >
          <p className="mb-4 font-mono text-label tracking-caps text-muted-text uppercase">
            {theme}
          </p>
          {children}
        </div>
      ))}
    </div>
  );
}
