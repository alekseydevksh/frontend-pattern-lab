import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Stores a theme choice the way a returning visitor would have it, before any page script runs. */
export async function storeTheme(page: Page, theme: string) {
  await page.addInitScript((value) => localStorage.setItem('pl-theme', value), theme);
}

/**
 * Waits until React has hydrated the page's buttons. Key presses before that go nowhere,
 * because the player attaches its key listener when it hydrates; under load that can be a
 * moment after the page's load event. React marks every element it manages with a
 * `__reactProps$...` property, which is what this looks for.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector('main button');
    return !!button && Object.keys(button).some((key) => key.startsWith('__reactProps'));
  });
}

/**
 * Runs axe with every WCAG A and AA rule it knows, plus its best practices. The faint page
 * grid is a background image, which makes axe skip the contrast check for text above it, so
 * it is switched off for the run: contrast is then measured against the plain paper colour.
 */
export async function expectNoAxeViolations(page: Page) {
  await page.addStyleTag({ content: 'body { background-image: none !important; }' });
  // Colours must be at rest: axe would otherwise measure the middle of a transition.
  // A paused animation never finishes: leave it where it is and check the page as shown.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => a.finished),
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? n.html)),
  }));
  expect(summary).toEqual([]);
  // A contrast check that axe could not decide is not a pass, with one exception: axe cannot
  // measure symbols such as the arrow keys ("only non-text characters"). Those are drawn in
  // the ink colour on the paper colour, which the gallery's text checks already cover.
  const undecided = results.incomplete
    .filter((rule) => rule.id === 'color-contrast')
    .flatMap((rule) => rule.nodes)
    .filter((node) => !node.any.some((check) => check.data?.messageKey === 'nonBmp'))
    // Text inside an SVG scene sits on shapes (bgOverlap) or straight on the image (imgNode),
    // so axe cannot work out its background, and it will not judge a single character such
    // as the digit in a badge (shortTextContent). Scenes only use token colours on paper,
    // panel or a filled signal colour (--on-signal); src/styles/contrast.test.ts checks those.
    .filter(
      (node) =>
        !(
          node.html.startsWith('<text') &&
          node.any.some((check) =>
            ['bgOverlap', 'imgNode', 'shortTextContent'].includes(String(check.data?.messageKey)),
          )
        ),
    )
    .map((node) => node.target.join(' '));
  expect(undecided).toEqual([]);
}
