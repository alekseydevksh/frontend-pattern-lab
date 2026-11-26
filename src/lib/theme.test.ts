import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  parseTheme,
  readDocumentTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  subscribeToTheme,
  themeInitScript,
  toggleTheme,
} from './theme';

function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersDark,
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((fn) => fn());
    },
    listenerCount: () => listeners.size,
  };
}

beforeEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('storage key and attribute', () => {
  it('match the reference prototype', () => {
    expect(THEME_STORAGE_KEY).toBe('pl-theme');
    expect(THEME_ATTRIBUTE).toBe('data-theme');
  });
});

describe('parseTheme', () => {
  it('accepts only light and dark', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('Dark')).toBeNull();
    expect(parseTheme('')).toBeNull();
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme(1)).toBeNull();
  });
});

describe('resolveTheme', () => {
  it('prefers the explicit attribute over the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('falls back to the system preference when the attribute is missing or invalid', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
    expect(resolveTheme('sepia', true)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('flips between the two themes', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});

describe('readStoredTheme', () => {
  it('returns a valid stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores a missing or invalid value', () => {
    expect(readStoredTheme()).toBeNull();
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readStoredTheme()).toBeNull();
  });

  it('returns null instead of throwing when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(readStoredTheme(broken)).toBeNull();
  });

  it('returns null when there is no storage at all', () => {
    expect(readStoredTheme(null)).toBeNull();
  });

  it('returns null when reading window.localStorage itself throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(readStoredTheme()).toBeNull();
    expect(storeTheme('dark')).toBe(false);
  });
});

describe('storeTheme', () => {
  it('writes the choice under the prototype key', () => {
    expect(storeTheme('dark')).toBe(true);
    expect(localStorage.getItem('pl-theme')).toBe('dark');
  });

  it('returns false instead of throwing when the write fails', () => {
    const full = {
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(storeTheme('light', full)).toBe(false);
  });

  it('returns false when there is no storage', () => {
    expect(storeTheme('light', null)).toBe(false);
  });
});

describe('document theme', () => {
  it('applyTheme sets the attribute', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('readDocumentTheme follows the attribute, then the system preference', () => {
    stubMatchMedia(true);
    expect(readDocumentTheme()).toBe('dark');
    applyTheme('light');
    expect(readDocumentTheme()).toBe('light');
  });

  it('readDocumentTheme works when matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(readDocumentTheme()).toBe('light');
  });

  it('toggleTheme starts from the system preference, applies and stores the other theme', () => {
    stubMatchMedia(true);
    expect(toggleTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(toggleTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggleTheme still switches when storage is blocked', () => {
    stubMatchMedia(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(toggleTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('subscribeToTheme', () => {
  it('notifies on an attribute change and on a system preference change', async () => {
    const media = stubMatchMedia(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeToTheme(onChange);
    expect(media.listenerCount()).toBe(1);

    applyTheme('dark');
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    media.change(true);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(media.listenerCount()).toBe(0);
    applyTheme('light');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('themeInitScript', () => {
  const run = () => new Function(themeInitScript)();

  it('copies a stored dark choice onto <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    run();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('copies a stored light choice onto <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    run();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('leaves <html> alone when nothing is stored, so the system preference applies', () => {
    run();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, '"><script>');
    run();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('does not throw when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(run).not.toThrow();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('does not throw when localStorage is not accessible at all', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(run).not.toThrow();
  });

  it('is a single self-contained call with no imports or template leftovers', () => {
    expect(themeInitScript).not.toContain('${');
    expect(themeInitScript).not.toContain('import');
    expect(themeInitScript.startsWith('(function(){')).toBe(true);
  });
});
