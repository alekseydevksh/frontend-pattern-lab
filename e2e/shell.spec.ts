import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, storeTheme, waitForHydration } from './support';

/**
 * The app shell: the catalog, `?step=` deep links, saved progress, next-lesson navigation and
 * the 404 page. The lessons are stepped with the keyboard and the real clock (no frame times
 * are checked here; lessons.spec.ts does that against a frozen clock).
 */

const LESSON_1 = '/lessons/optimistic-ui/';
const LESSON_2 = '/lessons/push-pull-sync/';
const STORAGE_KEY = 'pl-progress';

const stepTitle = (page: Page) => page.getByRole('heading', { level: 2 });
// The step card also holds invisible copies of every step (to reserve its height), so the
// counter is looked for in the live region, which has the visible step only.
const stepCounter = (page: Page, n: number, total: number) =>
  page.locator('[aria-live="polite"]').getByText(`Step ${n} / ${total}`);
const search = (page: Page) => page.evaluate(() => window.location.search);
const card = (page: Page, title: string) =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, level: 3 }) });
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);

/** Collects what a visitor's console would show: hydration mismatches are logged as errors. */
function watchForErrors(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  return problems;
}

async function openLesson(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page);
}

test.describe('the catalog', () => {
  test.use({ colorScheme: 'light' });

  test('lists all twelve lessons in one list, in order, with the track on each card', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Frontend Pattern Lab' }),
    ).toBeVisible();
    await expect(page.getByText('2 of 12 lessons are ready.')).toBeVisible();

    // One list in lesson order, numbered 1 to 12, not grouped by track.
    await expect(page.getByRole('list').filter({ has: page.getByRole('article') })).toHaveCount(1);
    await expect(page.getByRole('article')).toHaveCount(12);
    const titles = page.getByRole('article').getByRole('heading', { level: 3 });
    await expect(titles).toHaveText([
      'Optimistic UI',
      'Push + Pull Sync',
      'Virtualization',
      'Normalized Data',
      'Rendering Isolation',
      'State Ownership',
      'Requirements First and Component Boundaries',
      'Container, View, ViewModel',
      'Backend for Frontend',
      'Progressive Rendering',
      'Permission-Aware UI',
      'Errors and Observability',
    ]);
    const numbers = page.locator('article > p:first-child span[aria-hidden="true"]');
    await expect(numbers).toHaveText(
      Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    );
    // The track is a label on each card, ready or not.
    await expect(card(page, 'Optimistic UI')).toContainText('Data and state');
    await expect(card(page, 'Virtualization')).toContainText('Rendering and performance');
    await expect(card(page, 'Normalized Data')).toContainText('Data and state');
    await expect(card(page, 'Container, View, ViewModel')).toContainText('Structure');
    await expect(card(page, 'Errors and Observability')).toContainText('Product reliability');
    await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(10);

    // The ready lessons are links, and the others are not.
    await expect(page.getByRole('link', { name: 'Optimistic UI' })).toHaveAttribute(
      'href',
      '/lessons/optimistic-ui/',
    );
    await expect(page.getByRole('link', { name: 'Push + Pull Sync' })).toHaveAttribute(
      'href',
      '/lessons/push-pull-sync/',
    );
    await expect(page.getByRole('link', { name: 'Virtualization' })).toHaveCount(0);
    await expect(card(page, 'Virtualization').getByText('Coming soon')).toBeVisible();
    await expect(card(page, 'Optimistic UI').getByText('4 min')).toBeVisible();
    await expect(card(page, 'Push + Pull Sync').getByText('7 steps')).toBeVisible();
  });

  test('opens a lesson from its card, by mouse and by keyboard', async ({ page }) => {
    await page.goto('/');
    await card(page, 'Push + Pull Sync').click();
    await expect(page).toHaveURL(LESSON_2);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push + Pull Sync');

    await page.goto('/');
    await page.getByRole('link', { name: 'Optimistic UI' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(LESSON_1);
  });

  test('shows a visible focus ring around a card that has keyboard focus', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Optimistic UI' }).focus();
    const outline = await card(page, 'Optimistic UI').evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    expect(outline).toEqual({ width: '2px', style: 'solid' });
  });

  test('has the header, the skip link, the credit and the licences', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName('Skip to the content');
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();

    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Original explanations of ideas from');
    await expect(
      footer.getByRole('link', { name: /Frontend System Design Patterns/ }),
    ).toHaveAttribute('href', /medium\.com\/@dmitriilobanov3/);
    await expect(footer).toContainText(
      'by Dmitrii Lobanov. The step-by-step diagram format is inspired by',
    );
    await expect(
      footer.getByRole('link', { name: 'designed-to-scale.vercel.app' }),
    ).toHaveAttribute('href', 'https://designed-to-scale.vercel.app');
    await expect(footer.getByRole('link', { name: 'MIT licence' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'CC BY 4.0' })).toBeVisible();
    await expect(footer).toContainText('Latencies in the diagrams are simulated.');
  });

  test('has no horizontal scroll on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('page metadata and crawler files', () => {
  const site = 'https://frontend-pattern-lab.vercel.app';

  const meta = (page: Page) =>
    page.evaluate(() => {
      const get = (selector: string, attr: string) =>
        document.querySelector(selector)?.getAttribute(attr) ?? null;
      return {
        title: document.title,
        description: get('meta[name="description"]', 'content'),
        canonical: get('link[rel="canonical"]', 'href'),
        robots: get('meta[name="robots"]', 'content'),
        ogTitle: get('meta[property="og:title"]', 'content'),
        ogDescription: get('meta[property="og:description"]', 'content'),
        ogUrl: get('meta[property="og:url"]', 'content'),
        ogType: get('meta[property="og:type"]', 'content'),
        ogSite: get('meta[property="og:site_name"]', 'content'),
      };
    });

  test('the catalog has a title, description, canonical address and Open Graph fields', async ({
    page,
  }) => {
    await page.goto('/');
    expect(await meta(page)).toMatchObject({
      title: 'Frontend Pattern Lab',
      canonical: `${site}/`,
      ogTitle: 'Frontend Pattern Lab',
      ogUrl: `${site}/`,
      ogType: 'website',
      ogSite: 'Frontend Pattern Lab',
      robots: null,
    });
    expect((await meta(page)).description).toContain('animated lessons');
    expect((await meta(page)).ogDescription).toBe((await meta(page)).description);
  });

  test('each lesson has its own', async ({ page }) => {
    await page.goto(LESSON_2);
    expect(await meta(page)).toMatchObject({
      title: 'Push + Pull Sync · Frontend Pattern Lab',
      description:
        'Load with requests, stay fresh with events, and recover when the connection drops.',
      canonical: `${site}${LESSON_2}`,
      ogTitle: 'Push + Pull Sync · Frontend Pattern Lab',
      ogUrl: `${site}${LESSON_2}`,
    });
  });

  test('a query string does not change the canonical address', async ({ page }) => {
    await page.goto(`${LESSON_1}?step=4`);
    expect((await meta(page)).canonical).toBe(`${site}${LESSON_1}`);
  });

  test('the /dev/ pages are noindex', async ({ page }) => {
    for (const path of ['/dev/player/', '/dev/components/']) {
      await page.goto(path);
      expect((await meta(page)).robots, path).toMatch(/noindex/);
    }
  });

  test('the 404 page is noindex', async ({ request }) => {
    const response = await request.get('/no-such-page/');
    expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
  });

  test('sitemap.xml lists the catalog and the ready lessons, and not /dev/', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([
      `${site}/`,
      `${site}${LESSON_1}`,
      `${site}${LESSON_2}`,
    ]);
    expect(xml).not.toContain('/dev/');
  });

  test('robots.txt points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-Agent: *');
    expect(body).toContain(`Sitemap: ${site}/sitemap.xml`);
  });
});

test.describe('?step= deep links', () => {
  test.use({ colorScheme: 'light' });

  test('opens the lesson at the step in the address', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=3`);
    await expect(stepTitle(page)).toHaveText('The server can still say no');
    await expect(stepCounter(page, 3, 6)).toBeVisible();
    expect(await search(page)).toBe('?step=3');
  });

  test('the first step has a clean address', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=1`);
    await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
    await expect.poll(() => search(page)).toBe('');
  });

  test('clamps a number that is too big or too small', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=99`);
    await expect(stepTitle(page)).toHaveText('A quick test');
    await expect.poll(() => search(page)).toBe('?step=6');

    await openLesson(page, `${LESSON_1}?step=0`);
    await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
    await expect.poll(() => search(page)).toBe('');

    await openLesson(page, `${LESSON_1}?step=-7`);
    await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
  });

  test('ignores a value that is not a whole number', async ({ page }) => {
    for (const bad of ['abc', '2.5', '', '1e2']) {
      await openLesson(page, `${LESSON_1}?step=${bad}`);
      await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
      await expect.poll(() => search(page), bad).toBe('');
    }
  });

  test('keeps other parameters and the hash', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?utm=x&step=2#main`);
    await expect(stepTitle(page)).toHaveText('Update first, ask later');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => page.evaluate(() => window.location.search + window.location.hash))
      .toBe('?utm=x&step=3#main');
  });

  test('follows the learner step by step, without adding history entries', async ({ page }) => {
    await page.goto('/');
    await page.goto(LESSON_1);
    await waitForHydration(page);
    const entries = await page.evaluate(() => history.length);

    await page.keyboard.press('ArrowRight');
    await expect.poll(() => search(page)).toBe('?step=2');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => search(page)).toBe('?step=4');
    await page.getByRole('button', { name: 'Step 6: A quick test' }).click();
    await expect.poll(() => search(page)).toBe('?step=6');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => search(page)).toBe('');
    expect(await page.evaluate(() => history.length)).toBe(entries);

    // So Back leaves the lesson instead of undoing a step.
    await page.keyboard.press('ArrowRight');
    await page.goBack();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Frontend Pattern Lab' }),
    ).toBeVisible();
  });

  test('a shared link opens the same step on a fresh visit', async ({ page, context }) => {
    await openLesson(page, LESSON_2);
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
    await expect.poll(() => search(page)).toBe('?step=5');
    const shared = page.url();

    const friend = await context.browser()!.newContext();
    const other = await friend.newPage();
    await openLesson(other, shared);
    await expect(stepTitle(other)).toHaveText((await stepTitle(page).textContent()) ?? '');
    await friend.close();
  });

  test('serves the lesson as a static page: the first step is in the HTML', async ({ request }) => {
    const html = await (await request.get(`${LESSON_1}?step=4`)).text();
    expect(html).toContain('Waiting makes a tap feel broken');
  });
});

test.describe('next-lesson navigation', () => {
  test.use({ colorScheme: 'light' });

  test('the last step of lesson 1 offers the next lesson, and the button goes there', async ({
    page,
  }) => {
    await openLesson(page, `${LESSON_1}?step=6`);
    const button = page.getByRole('button', { name: 'Next lesson: Push + Pull Sync →' });
    await expect(button).toBeVisible();
    await expect(page.getByRole('button', { name: /Restart/ })).toHaveCount(0);
    await button.click();
    await expect(page).toHaveURL(LESSON_2);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push + Pull Sync');
    // The new lesson starts at its first step: the old ?step=6 must not carry over.
    await expect(stepTitle(page)).toHaveText('Load with a request');
    await expect(stepCounter(page, 1, 7)).toBeVisible();
    expect(await search(page)).toBe('');
  });

  test('the right arrow on the last step goes to the next lesson too', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=6`);
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(LESSON_2);
    await expect(stepTitle(page)).toHaveText('Load with a request');
  });

  test('earlier steps still say what comes next in the lesson', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=5`);
    await expect(page.getByRole('button', { name: 'Next: A quick test →' })).toBeVisible();
  });

  test('the last lesson keeps "Restart lesson", and the arrow does nothing', async ({ page }) => {
    await openLesson(page, `${LESSON_2}?step=7`);
    const restart = page.getByRole('button', { name: 'Restart lesson ↺' });
    await expect(restart).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(`${LESSON_2}?step=7`);
    await restart.click();
    await expect(stepTitle(page)).toHaveText('Load with a request');
    await expect.poll(() => search(page)).toBe('');
  });

  test('has the Simulated pill next to the metrics, outside the diagram', async ({ page }) => {
    await openLesson(page, LESSON_1);
    const pill = page.getByText('Simulated', { exact: true });
    await expect(pill).toBeVisible();
    await expect(page.getByRole('img').getByText('Simulated')).toHaveCount(0);
    await expect(page.getByText('Latencies in the diagrams are simulated.')).toBeVisible();
  });
});

test.describe('saved progress', () => {
  test.use({ colorScheme: 'light' });

  test('remembers the furthest step, and the catalog shows it', async ({ page }) => {
    await openLesson(page, LESSON_1);
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft'); // going back must not lower it
    await expect.poll(() => stored(page)).toContain('"step":3');

    await page.goto('/');
    await expect(card(page, 'Optimistic UI').getByText('Step 4 of 6')).toBeVisible();
    await expect(card(page, 'Push + Pull Sync').getByText(/Step|Completed/)).toHaveCount(0);
    await expect(card(page, 'Virtualization').getByText(/Step|Completed/)).toHaveCount(0);
  });

  test('marks a lesson completed when its last step has been reached', async ({ page }) => {
    await openLesson(page, `${LESSON_2}?step=7`);
    await page.keyboard.press('ArrowLeft');
    await page.goto('/');
    await expect(card(page, 'Push + Pull Sync').getByText('Completed')).toBeVisible();
    await expect(card(page, 'Optimistic UI').getByText(/Step|Completed/)).toHaveCount(0);
  });

  test('ticks the takeaways again on a later visit, after hydration', async ({ page }) => {
    await openLesson(page, `${LESSON_1}?step=6`);
    await expect.poll(() => stored(page)).toContain('"completed":true');

    await openLesson(page, LESSON_1); // back at step 1, but the progress is remembered
    const ticked = page.getByRole('region', { name: "You'll learn" }).getByRole('listitem');
    await expect
      .poll(() => ticked.evaluateAll((items) => items.map((li) => li.getAttribute('data-reached'))))
      .toEqual(['true', 'true', 'true', 'true']);
    await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
  });

  test('renders the same HTML for a returning visitor, with no hydration errors', async ({
    page,
    request,
  }) => {
    const problems = watchForErrors(page);
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key!, value!),
      [
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          lessons: {
            'optimistic-ui': { step: 2, ticked: [0, 1, 2], completed: false },
            'push-pull-sync': { step: 6, ticked: [0, 1, 2, 3], completed: true },
          },
        }),
      ],
    );
    // The server sends no progress at all: it has no storage to read.
    const html = await (await request.get('/')).text();
    expect(html).not.toMatch(/Step 3 of 6|Completed/);

    await page.goto('/');
    await expect(card(page, 'Optimistic UI').getByText('Step 3 of 6')).toBeVisible();
    await expect(card(page, 'Push + Pull Sync').getByText('Completed')).toBeVisible();
    await openLesson(page, LESSON_1);
    await openLesson(page, `${LESSON_2}?step=3`);
    expect(problems).toEqual([]);
  });

  test('does not shift the layout when saved progress arrives', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key!, value!),
      [
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          lessons: { 'optimistic-ui': { step: 2, ticked: [0], completed: false } },
        }),
      ],
    );
    await page.goto('/');
    const before = await card(page, 'Optimistic UI').boundingBox();
    await expect(card(page, 'Optimistic UI').getByText('Step 3 of 6')).toBeVisible();
    const after = await card(page, 'Optimistic UI').boundingBox();
    const next = await card(page, 'Push + Pull Sync').boundingBox();
    expect(after?.height).toBe(before?.height);
    expect(next?.y).toBe(before?.y);
  });

  test('ignores stored text that is not valid progress', async ({ page }) => {
    const problems = watchForErrors(page);
    for (const junk of ['not json', '{"v":1,"lessons":{"optimistic-ui":"x"}}', '[]', '{"v":9}']) {
      await page.addInitScript((value) => localStorage.setItem('pl-progress', value), junk);
      await page.goto('/');
      await expect(page.getByRole('article')).toHaveCount(12);
      await expect(page.getByText(/^Step \d of/)).toHaveCount(0);
      await openLesson(page, LESSON_1);
      await expect(stepTitle(page)).toHaveText('Waiting makes a tap feel broken');
    }
    expect(problems).toEqual([]);
  });

  test('still works when storage is blocked', async ({ page }) => {
    const problems = watchForErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await expect(page.getByRole('article')).toHaveCount(12);
    await openLesson(page, LESSON_1);
    await page.keyboard.press('ArrowRight');
    await expect(stepTitle(page)).toHaveText('Update first, ask later');
    // The takeaway for step 2 is still ticked for this visit, saved or not.
    await expect(
      page.getByRole('region', { name: "You'll learn" }).locator('li[data-reached="true"]'),
    ).toHaveCount(2);
    expect(problems).toEqual([]);
  });
});

test.describe('the 404 page', () => {
  test.use({ colorScheme: 'light' });

  test('answers an unknown address with status 404 and a way back', async ({ page }) => {
    const response = await page.goto('/lessons/no-such-lesson/');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page is not here' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Page not found · Frontend Pattern Lab');
    // It keeps the header and the footer, so the visitor is never stranded.
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    await page.getByRole('link', { name: 'See all lessons' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('article')).toHaveCount(12);
  });

  test('answers a lesson that is only coming soon with 404', async ({ page }) => {
    const response = await page.goto('/lessons/virtualization/');
    expect(response?.status()).toBe(404);
  });
});

test.describe('accessibility (axe)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.use({ colorScheme: theme });

      test('the catalog has no violations', async ({ page }) => {
        await storeTheme(page, theme);
        await page.goto('/');
        await expect(page.getByRole('article')).toHaveCount(12);
        await expectNoAxeViolations(page);
      });

      test('the catalog has no violations with saved progress shown', async ({ page }) => {
        await storeTheme(page, theme);
        await page.addInitScript(() =>
          localStorage.setItem(
            'pl-progress',
            JSON.stringify({
              v: 1,
              lessons: {
                'optimistic-ui': { step: 2, ticked: [0, 1], completed: false },
                'push-pull-sync': { step: 6, ticked: [0, 1, 2, 3], completed: true },
              },
            }),
          ),
        );
        await page.goto('/');
        await expect(page.getByText('Step 3 of 6')).toBeVisible();
        await expectNoAxeViolations(page);
      });

      test('the 404 page has no violations', async ({ page }) => {
        await storeTheme(page, theme);
        await page.goto('/no-such-page/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoAxeViolations(page);
      });

      test('a lesson page with its header and footer has no violations', async ({ page }) => {
        await storeTheme(page, theme);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openLesson(page, `${LESSON_1}?step=6`);
        await expectNoAxeViolations(page);
      });
    });
  }
});
