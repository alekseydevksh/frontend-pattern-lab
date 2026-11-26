import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WCAG contrast of every text colour on the two surfaces text sits on, in both themes.
 *
 * axe checks contrast on the page, but it cannot measure text inside an SVG scene (the text
 * is overlapped by the panel shapes drawn under it). Scenes colour text only with these
 * tokens, on paper or on panel, so checking the tokens here covers the diagrams too.
 */
const tokens = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

type Rgb = [number, number, number];

function block(selectorStart: string): string {
  const start = tokens.indexOf(selectorStart);
  expect(start, `${selectorStart} block exists`).toBeGreaterThanOrEqual(0);
  return tokens.slice(start, tokens.indexOf('}', start));
}

function colours(css: string): Record<string, Rgb> {
  const found: Record<string, Rgb> = {};
  for (const [, name, hex] of css.matchAll(/--([a-z-]+): (#[0-9a-f]{6});/g)) {
    const n = parseInt(hex!.slice(1), 16);
    found[name!] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return found;
}

/** `color-mix(in srgb, A share%, B)`: a straight blend of the sRGB channel values. */
const mix = (a: Rgb, share: number, b: Rgb): Rgb =>
  a.map((channel, i) => channel * share + b[i]! * (1 - share)) as Rgb;

function luminance([r, g, b]: Rgb): number {
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const themes = {
  light: colours(block(":root,\n[data-theme='light']")),
  dark: colours(block("[data-theme='dark'] {")),
};

describe('the derived text tokens', () => {
  it('mix 70% of the colour with 30% ink, as this test assumes', () => {
    for (const tone of ['muted', 'req', 'res', 'ev', 'bad']) {
      expect(tokens).toContain(
        `--${tone}-text: color-mix(in srgb, var(--${tone}) 70%, var(--ink));`,
      );
    }
  });
});

describe.each(Object.entries(themes))('text contrast in the %s theme', (_theme, c) => {
  const text: Record<string, Rgb> = {
    ink: c.ink!,
    'muted-text': mix(c.muted!, 0.7, c.ink!),
    'req-text': mix(c.req!, 0.7, c.ink!),
    'res-text': mix(c.res!, 0.7, c.ink!),
    'ev-text': mix(c.ev!, 0.7, c.ink!),
    'bad-text': mix(c.bad!, 0.7, c.ink!),
  };
  const surfaces: Record<string, Rgb> = { paper: c.paper!, panel: c.panel! };

  for (const [name, colour] of Object.entries(text)) {
    for (const [surface, background] of Object.entries(surfaces)) {
      it(`${name} on ${surface} is at least 4.5:1`, () => {
        expect(contrastRatio(colour, background)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('has the contrast helper agree with a known pair: black on white is 21:1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });
});

/**
 * --on-signal is the text colour on a filled signal colour. The pairs below are the fills it is
 * used on (see D12 in docs/DECISIONS.md): the toast is --bad, the pending badge is the
 * -text shade of --req. The light theme's raw --req and --res are too pale for white text
 * (3.8:1 and 4.4:1), which is why a badge in those colours uses the shade, and why they are
 * not in this list. --ev and --bad pass raw in both themes, so they are listed as they are.
 */
describe.each(Object.entries(themes))('text on a filled signal colour in the %s theme', (_t, c) => {
  const onSignal = c['on-signal']!;
  const fills: Record<string, Rgb> = {
    bad: c.bad!,
    ev: c.ev!,
    'req-text': mix(c.req!, 0.7, c.ink!),
    'res-text': mix(c.res!, 0.7, c.ink!),
  };
  for (const [name, fill] of Object.entries(fills)) {
    it(`on-signal on ${name} is at least 4.5:1`, () => {
      expect(contrastRatio(onSignal, fill)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('is documented as the reason for the shade: raw req is below 4.5:1 in the light theme only', () => {
    const raw = contrastRatio(onSignal, c.req!);
    if (_t === 'light') expect(raw).toBeLessThan(4.5);
    else expect(raw).toBeGreaterThanOrEqual(4.5);
  });
});
