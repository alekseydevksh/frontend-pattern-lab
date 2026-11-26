import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, storeTheme } from './support';

const GALLERY = '/dev/components/';
const THEMES = ['light', 'dark'] as const;
const PAPER = { light: 'rgb(237, 240, 245)', dark: 'rgb(12, 20, 38)' } as const;

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await storeTheme(page, theme);
    });

    test('the component gallery has no axe violations', async ({ page }) => {
      await page.goto(GALLERY);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectNoAxeViolations(page);
    });

    test('the catalog has no axe violations', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectNoAxeViolations(page);
    });
  });

  test(`the ${theme} theme is also applied from the system preference alone`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: theme });
    const page = await context.newPage();
    await page.goto(GALLERY);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
    const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(paper).toBe(PAPER[theme]);
    await expectNoAxeViolations(page);
    await context.close();
  });
}

test.describe('theme toggle', () => {
  test.use({ colorScheme: 'light' });

  test('switches theme, updates aria-pressed and survives a reload', async ({ page }) => {
    await page.goto(GALLERY);
    const toggle = page.getByRole('button', { name: 'Toggle dark theme' });
    const html = page.locator('html');

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('pl-theme'))).toBe('dark');
    await expectNoAxeViolations(page);

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('honours a choice stored under the prototype key', async ({ page }) => {
    await storeTheme(page, 'dark');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('sets the stored theme before any script bundle runs, so nothing flashes', async ({
    page,
  }) => {
    await storeTheme(page, 'dark');
    await page.route('**/_next/static/**/*.js', (route) => route.abort());
    await page.goto(GALLERY);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      PAPER.dark,
    );
  });

  test('keeps working when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(GALLERY);
    await page.getByRole('button', { name: 'Toggle dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
});

test.describe('keyboard', () => {
  test.use({ colorScheme: 'light' });

  test('every enabled control is reachable by Tab, in reading order, with a visible 2px focus ring', async ({
    page,
  }) => {
    await page.goto(GALLERY);
    const expected = ['Toggle dark theme', 'Next: update first', 'Back', 'Replay', 'Resume'];
    for (const name of expected) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveAccessibleName(name);
      const ring = await focused.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          width: style.outlineWidth,
          style: style.outlineStyle,
          offset: style.outlineOffset,
        };
      });
      expect(ring).toEqual({ width: '2px', style: 'solid', offset: '2px' });
    }
  });

  test('disabled buttons are disabled, so Tab skips them', async ({ page }) => {
    await page.goto(GALLERY);
    await expect(page.getByRole('button', { name: 'Next (disabled)' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Back (disabled)' })).toBeDisabled();
  });

  test('the theme toggle works with Enter and with Space', async ({ page }) => {
    await page.goto(GALLERY);
    const html = page.locator('html');
    await page.getByRole('button', { name: 'Toggle dark theme' }).focus();
    await page.keyboard.press('Enter');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Space');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('buttons activate with Enter and Space', async ({ page }) => {
    await page.goto(GALLERY);
    await page.evaluate(() => {
      const w = window as unknown as { clicks: string[] };
      w.clicks = [];
      document.querySelectorAll('main button').forEach((b) => {
        b.addEventListener('click', () => w.clicks.push(b.textContent ?? ''));
      });
    });
    await page.getByRole('button', { name: 'Back', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => (window as unknown as { clicks: string[] }).clicks)).toEqual([
      'Back',
      'Back',
    ]);
  });
});

test.describe('reduced motion', () => {
  const transitionOf = (page: Page, name: string) =>
    page.getByRole('button', { name }).evaluate((el) => getComputedStyle(el).transitionDuration);

  test('buttons transition by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(GALLERY);
    expect(await transitionOf(page, 'Next: update first')).toBe('0.25s');
  });

  test('transitions are off when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(GALLERY);
    expect(await transitionOf(page, 'Next: update first')).toBe('0s');
    expect(await transitionOf(page, 'Toggle dark theme')).toBe('0s');
  });
});
