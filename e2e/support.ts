import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Stores a theme choice the way a returning visitor would have it, before any page script runs. */
export async function storeTheme(page: Page, theme: string) {
  await page.addInitScript((value) => localStorage.setItem('pl-theme', value), theme);
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
    // so axe cannot work out its background. Scenes only use token colours on paper or panel;
    // src/styles/contrast.test.ts checks those.
    .filter(
      (node) =>
        !(
          node.html.startsWith('<text') &&
          node.any.some((check) =>
            ['bgOverlap', 'imgNode'].includes(String(check.data?.messageKey)),
          )
        ),
    )
    .map((node) => node.target.join(' '));
  expect(undecided).toEqual([]);
}
