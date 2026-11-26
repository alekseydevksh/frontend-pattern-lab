/**
 * Theme logic, kept apart from React so it can be unit tested and so the same constants
 * feed the inline no-flash script.
 *
 * The attribute name, the values and the storage key are the ones the reference prototype
 * uses, so a choice stored by the prototype is honoured here and the other way round.
 * Every storage access is wrapped, because storage can be missing, full or blocked.
 */

export type Theme = 'light' | 'dark';

export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_STORAGE_KEY = 'pl-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Narrows an unknown stored or attribute value to a theme, or null. */
export function parseTheme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** The theme in effect: the explicit attribute wins, otherwise the system preference. */
export function resolveTheme(attribute: string | null, systemPrefersDark: boolean): Theme {
  return parseTheme(attribute) ?? (systemPrefersDark ? 'dark' : 'light');
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

/** Reading `window.localStorage` can itself throw, for example when cookies are blocked. */
function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored choice, or null when nothing valid is stored or storage is unavailable. */
export function readStoredTheme(storage: ReadableStorage | null = browserStorage()): Theme | null {
  try {
    return parseTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Remembers the choice. Returns false when storage refused, which is not an error. */
export function storeTheme(
  theme: Theme,
  storage: WritableStorage | null = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme);
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** The theme currently shown, read from the document. */
export function readDocumentTheme(): Theme {
  return resolveTheme(document.documentElement.getAttribute(THEME_ATTRIBUTE), systemPrefersDark());
}

/** Calls `onChange` when the attribute or the system preference changes. Returns an unsubscribe. */
export function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  query?.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    query?.removeEventListener('change', onChange);
  };
}

/** Switches to the other theme, applies it and remembers it. Returns the new theme. */
export function toggleTheme(): Theme {
  const next = nextTheme(readDocumentTheme());
  applyTheme(next);
  storeTheme(next);
  return next;
}

/**
 * Inline script for <head>. It runs before first paint and copies a stored choice onto
 * <html>, so a returning visitor never sees the wrong theme flash. With nothing stored,
 * the CSS follows the system preference by itself. Plain ES5 and self-contained: it is
 * serialised into the page and cannot import anything.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark'){document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},t)}}catch(e){}})();`;
