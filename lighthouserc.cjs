// Lighthouse CI: measures the catalog and one lesson page of the static export on Lighthouse's
// mobile profile (a phone-sized screen, a 4x slower CPU and simulated slow 4G), five runs each,
// judged by the median of each metric across the runs, so one cold first run cannot fail the build. The budget is the one in docs/SPEC.md ("Starting performance budget").
// Run it with `pnpm lighthouse`, which builds nothing: run `pnpm build` first.
// `LIGHTHOUSE_LESSON=<slug> pnpm lighthouse` also measures that lesson's page: the new lesson
// procedure in docs/ADDING_A_LESSON.md uses it. CI measures the two pages below only.
const port = 4175;
const origin = `http://localhost:${port}`;
const extra = process.env.LIGHTHOUSE_LESSON;
if (extra && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(extra)) {
  throw new Error(`LIGHTHOUSE_LESSON must be a lesson slug, not "${extra}".`);
}

module.exports = {
  ci: {
    collect: {
      // Serves out/ with compression, as a host would (see scripts/serve-out.mjs).
      startServerCommand: `PORT=${port} node scripts/serve-out.mjs`,
      startServerReadyPattern: 'Serving',
      url: [
        `${origin}/`,
        `${origin}/lessons/optimistic-ui/`,
        ...(extra && extra !== 'optimistic-ui' ? [`${origin}/lessons/${extra}/`] : []),
      ],
      numberOfRuns: 5,
      settings: {
        // The mobile profile is Lighthouse's default; it is stated here so it cannot change by accident.
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
        throttlingMethod: 'simulate',
        // The sandbox is not available in most CI containers.
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
