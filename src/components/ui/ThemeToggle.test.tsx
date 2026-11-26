import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@messages/en.json';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeToggle } from './ThemeToggle';

function stubSystemTheme(prefersDark: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: prefersDark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeToggle', () => {
  it('is a button named from the message file, with its visible label', () => {
    stubSystemTheme(false);
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: messages.theme.toggleLabel });
    expect(button.textContent).toContain(messages.theme.label);
  });

  it('reports the system theme through aria-pressed when nothing is chosen', () => {
    stubSystemTheme(true);
    render(<ThemeToggle />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the theme, stores it and updates aria-pressed on click', async () => {
    stubSystemTheme(false);
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      fireEvent.click(button);
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      fireEvent.click(button);
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('follows a theme set from outside, such as the Storybook toolbar', async () => {
    stubSystemTheme(false);
    render(<ThemeToggle />);
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('still switches when storage is blocked', async () => {
    stubSystemTheme(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
