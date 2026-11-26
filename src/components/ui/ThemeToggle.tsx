'use client';

import { useSyncExternalStore } from 'react';
import messages from '@messages/en.json';
import { cx } from '@/lib/cx';
import { readDocumentTheme, subscribeToTheme, toggleTheme } from '@/lib/theme';

/** Before hydration the server cannot know the theme, so it renders the light state. */
const serverTheme = () => 'light' as const;

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Switches between the light and dark theme. A native toggle button: `aria-pressed` is
 * true while the dark theme shows. The choice is stored and applied through lib/theme.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeToTheme, readDocumentTheme, serverTheme);
  return (
    <button
      type="button"
      aria-pressed={theme === 'dark'}
      aria-label={messages.theme.toggleLabel}
      onClick={toggleTheme}
      className={cx(
        'inline-flex items-center gap-2 rounded-field border-[1.5px] border-line bg-panel px-3 py-1.5 font-medium text-ink transition-colors duration-(--duration-ui) hover:bg-paper',
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor" />
      </svg>
      <span>{messages.theme.label}</span>
    </button>
  );
}
