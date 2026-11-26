// `pnpm screenshots <slug>`: takes a full-page screenshot of every step of one lesson, in the light
// and dark themes, at desktop and phone width, from the static export, for the owner's visual check.
// Run `pnpm build` first. Reduced motion is on, so each picture shows the step's final state.
//
//   pnpm screenshots virtualization
//   pnpm screenshots virtualization --out ~/Desktop/shots
//
// The pictures go to a folder outside the repository, so they are never committed: by default
// `../pattern-lab-screenshots/<slug>/` next to the repository folder. Files are named
// `<width>-<theme>-step-<NN>.png`. The step count is read from the page, so any lesson works.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const outFlag = args.indexOf('--out');
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: pnpm screenshots <lesson-slug> [--out <folder>]');
  process.exit(1);
}
if (!existsSync(join(root, 'out', 'lessons', slug, 'index.html'))) {
  console.error(`No page for "${slug}" in out/. Run \`pnpm build\` first, and check the slug.`);
  process.exit(1);
}
const out = resolve(
  outFlag === -1 ? join(root, '..', 'pattern-lab-screenshots', slug) : args[outFlag + 1],
);
mkdirSync(out, { recursive: true });

const port = 4179;
const server = spawn('node', [join(root, 'scripts', 'serve-out.mjs')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
const base = `http://localhost:${port}`;
for (let i = 0; i < 50; i += 1) {
  const up = await fetch(base).then(
    () => true,
    () => false,
  );
  if (up) break;
  await new Promise((r) => setTimeout(r, 100));
}

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812 },
];
const themes = ['light', 'dark'];

const browser = await chromium.launch();
let count = 0;
try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        reducedMotion: 'reduce',
        colorScheme: theme,
      });
      await context.addInitScript((value) => localStorage.setItem('pl-theme', value), theme);
      const page = await context.newPage();
      await page.goto(`${base}/lessons/${slug}/`);
      const steps = await page
        .getByRole('list', { name: 'Lesson steps' })
        .getByRole('button')
        .count();
      for (let step = 1; step <= steps; step += 1) {
        await page.goto(`${base}/lessons/${slug}/${step > 1 ? `?step=${step}` : ''}`);
        // `?step=` is applied after hydration: wait for the step card to show the step.
        await page.locator('[aria-live="polite"]').getByText(`Step ${step} / ${steps}`).waitFor();
        await page.evaluate(() => document.fonts.ready);
        const file = join(
          out,
          `${viewport.name}-${theme}-step-${String(step).padStart(2, '0')}.png`,
        );
        await page.screenshot({ path: file, fullPage: true });
        count += 1;
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`${count} screenshots of "${slug}" in ${out}`);
