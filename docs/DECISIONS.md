# Decisions

Short decision records. Every dependency has one sentence on what it is for and why the
platform or an existing tool is not enough. Versions are those resolved at project start
(2026-11-26) and pinned by `pnpm-lock.yaml`.

## D1. Tools and installed versions (2026-11-26)

Runtime: Node 24.22.2 (`.nvmrc`), pnpm 12.21.0 (`packageManager` field).

| Package                                           | Version                | Reason                                                                                            |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `next`                                            | 16.4.6                 | App Router with file-based routes and static export, as the spec chooses.                         |
| `react`, `react-dom`                              | 19.3.1                 | The UI library the lessons teach about; required by Next.js.                                      |
| `typescript`                                      | 6.0.3 (pinned to 6.x)  | Strict typing for lesson data; see D2 for why not 7.x.                                            |
| `@types/node`, `@types/react`, `@types/react-dom` | 26.6.7, 19.3.1, 19.3.0 | Type declarations that TypeScript needs for Node and React.                                       |
| `tailwindcss`, `@tailwindcss/postcss`             | 4.3.5                  | Utility classes that read from CSS-variable tokens; the PostCSS plugin is how v4 runs in Next.js. |
| `eslint`                                          | 9.39.5 (pinned to 9.x) | Code rules in CI; see D3 for why not 10.x.                                                        |
| `eslint-config-next`                              | 16.4.6                 | Next.js and React rules maintained alongside the framework.                                       |
| `eslint-plugin-jsx-a11y`                          | 6.10.2                 | Enables the full recommended accessibility rule set; the Next config enables only a subset.       |
| `prettier`                                        | 3.10.1                 | One code style, checked in CI.                                                                    |
| `vitest`                                          | 5.1.1                  | Fast unit tests for the engine and content validation, as the spec chooses.                       |
| `jsdom`                                           | 31.0.1                 | Vitest needs a DOM implementation to render components; Node has none.                            |
| `@testing-library/react`, `@testing-library/dom`  | 16.3.3, 10.4.2         | Tests assert on roles and visible text; the DOM package is a peer of the React one.               |
| `@playwright/test`                                | 1.65.1                 | End-to-end tests of whole lessons in a real browser.                                              |

Added in M1: see D8, and in M4: see D13. Not yet installed, planned by the spec: Radix Primitives
(when a component needs Tabs, Tooltip, Dialog or Switch).

## D2. TypeScript pinned to 6.x (2026-11-26)

**Decision:** use TypeScript 6.0.3, not 7.0.2.
**Reason:** `typescript-eslint` refuses to load under TypeScript 7.0, so `pnpm lint` fails
outright. The spec asks for the latest stable version, but a working lint gate matters more.
**Alternatives:** run TypeScript 7 and a 6.x API side by side, which adds setup for no gain
in a project this size. Revisit when typescript-eslint supports TypeScript 7.1 or later.
**Review:** keep 6.x for now; revisit in M6.

## D3. ESLint pinned to 9.x (2026-11-26)

**Decision:** use ESLint 9.39.5, not 10.15.0.
**Reason:** `eslint-plugin-jsx-a11y`, `eslint-plugin-react` and `eslint-plugin-import` (pulled
in by `eslint-config-next`) list ESLint 9 as their highest supported peer. ESLint 10 happened
to run in a trial, but it leaves unmet peers in the tree, and the spec asks for a strict one.
**Alternatives:** ESLint 10 with a peer-dependency override, which hides the risk. pnpm prints
a deprecation notice for 9.x on install; revisit when the plugins add ESLint 10.
**Review:** keep 9.x for now; revisit in M6.

## D4. Hand-written scaffold instead of `create-next-app` (2026-11-26)

**Decision:** create the project files by hand.
**Reason:** the generated template adds sample pages, fonts and styles that would be deleted at
once, and its defaults differ from the spec (for example a different lint setup).

## D5. Static export settings (2026-11-26)

**Decision:** `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`.
**Reason:** the spec requires a static export with no server runtime. `trailingSlash` writes
`lesson/index.html` files, which any static host serves without rewrite rules. The image
optimiser needs a server, and the site has no raster images to optimise.

## D6. Dependency-free static server for `out/` (2026-11-26)

**Decision:** `scripts/serve-out.mjs`, about 50 lines of Node, serves the export for `pnpm start`
and for Playwright.
**Reason:** `next start` does not serve an export. `npx serve` would download an unpinned
package on every CI run, and a package such as `serve` would be a new dependency for a task
that `node:http` covers.

## D7. Test and config conventions (2026-11-26)

- Unit tests sit next to the code (`*.test.ts(x)`); end-to-end tests live in `e2e/`.
- `vitest.config.mts` uses the `.mts` extension so the package can stay CommonJS-typed
  without a loader warning.
- Path aliases `@/`, `@content/` and `@messages/` are declared in both `tsconfig.json` and
  `vitest.config.mts`, because Vite does not read `paths` by default.
- `eslint-config-prettier` is not installed: no stylistic ESLint rules are enabled, so there is
  nothing for it to switch off. Prettier runs as its own check.

## D8. Dependencies added in M1 (2026-11-26)

All are dev dependencies; none ships to the browser.

| Package                   | Version | Reason                                                                                                                         |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `storybook`               | 10.6.9  | Documents each component in both themes, as the spec requires; there is no lighter way to get a component catalogue.           |
| `@storybook/nextjs-vite`  | 10.6.9  | The official Storybook framework for Next.js; it understands `next/font` and the `@/` aliases.                                 |
| `vite`                    | 8.3.8   | Peer dependency of `@storybook/nextjs-vite`, which pnpm does not install on its own.                                           |
| `@storybook/addon-docs`   | 10.6.9  | Official addon that renders the autogenerated props table and docs page for each component.                                    |
| `@storybook/addon-a11y`   | 10.6.9  | Official addon that runs axe on every story, so contrast problems show up while designing.                                     |
| `@storybook/addon-themes` | 10.6.9  | Official addon that adds the light and dark switch to the toolbar by setting `data-theme`, as the site does.                   |
| `@axe-core/playwright`    | 4.14.1  | The official axe-core integration for Playwright (the spec calls for axe checks); calling `axe-core` directly needs glue code. |

`esbuild` build scripts are denied in `pnpm-workspace.yaml`: its binary arrives as an optional
package, so the install script is not needed, and pnpm 12 fails the install if it is left
undecided. `pnpm peers check` reports `typescript ^5` wanted by `tsconfck`, a transitive
dependency of `@storybook/nextjs-vite`; Storybook runs fine on TypeScript 6.0.3. Radix is not
added in M1 because no component in `components/ui` needs a complex pattern.

## D9. Design system choices in M1 (2026-11-26)

- **Derived text tokens.** The spec's signal colours keep their exact values, but used as
  small text they measure 3.2:1 to 4.3:1 in the light theme (AA needs 4.5:1), so the reference
  prototype's coloured pill and metric text would fail axe. Components use `--req-text`,
  `--res-text`, `--ev-text`, `--bad-text` and `--muted-text` (30% `--ink` mixed in), which give
  5:1 or better everywhere. Borders, fills and marks still use the raw colours.
- **Dark values written out, not `light-dark()`.** The dark theme redefines the same names, as
  the spec describes, and as the prototype does. It costs one repeated block of ten values.
- **Native elements, no Radix yet.** The seven ui components need no complex pattern. The toggle
  is a button with `aria-pressed`; Radix Switch would add a dependency for no gain. Radix comes
  in when a component needs Tabs, Tooltip or Dialog.
- **Fonts.** `next/font/google`: Bricolage Grotesque (600, 800), IBM Plex Sans (400, 500, 600)
  and IBM Plex Mono (400, 500, 600). All three are under the SIL Open Font Licence 1.1, which
  allows self-hosting and embedding. The files are downloaded at build time and served from the
  site, so visitors make no request to Google.
- **Hover states are an addition.** The prototype has none. Buttons get a small background shift
  on hover (`bg-paper` for secondary, a lighter ink for primary). Say if you want none.
- **Component gallery in the export.** `/dev/components/` ships in the static export, marked
  `noindex`, because the end-to-end tests run against the export. Hiding it from production
  would need a second build for tests. Revisit in M6.
- **Storybook telemetry off.** `core.disableTelemetry` is set, so nothing is sent from the
  machine that runs Storybook.
- **Not done in M1:** `--on-signal` text for use on filled signal colours (the prototype uses
  white on `--bad`, which is 2.8:1 in the dark theme). It is needed by the first scene that
  draws a toast or badge, so it is decided in M3.

## D10. Colour rule, and the owner's answers to the M1 questions (2026-11-26)

**Decision: the spec colours are for fills, lines and marks; the derived `-text` tokens are for
text.**

| Use                                                                                  | Token                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Borders, lines, dots, fills, tints, packets, the large marks of a diagram            | `--req`, `--res`, `--ev`, `--bad`, `--muted`, `--line` (spec)                  |
| Any text, however it is coloured: labels, values, status words, pills, metric values | `--ink`, `--muted-text`, `--req-text`, `--res-text`, `--ev-text`, `--bad-text` |
| Text on a filled signal colour (toast, badge, filled button)                         | `--on-signal`, on `--bad`, `--ev`, `--req-solid` or `--res-solid` (see D12)    |

**Reason:** in the light theme the spec's signal colours reach only 3.2:1 to 4.3:1 as text on
paper or panel, and WCAG AA asks for 4.5:1. Each `-text` token is the signal colour with 30%
`--ink` mixed in, which gives 5:1 or better on both surfaces in both themes, and still reads as
the same colour. The spec values are unchanged, so every line, fill and packet looks as the spec
and the prototype show it.
**How it is held:** `src/styles/contrast.test.ts` computes the contrast of every text token on
paper and on panel, in both themes, and fails below 4.5:1. axe cannot measure text inside an SVG
scene (it sits on shapes), so this test is what covers diagram text; the e2e axe helper skips only
SVG `<text>` that axe reports as undecidable for that reason.
**Alternatives:** change the spec values (rejected: the owner wants the spec colours kept) or use
dark text on every signal-coloured label (rejected: the colour is what carries the meaning).

Owner answers to the M1 questions, recorded:

- The derived `-text` tokens stay (the rule above).
- Lesson-level components are not part of M1. M2 builds only what the player test page needs
  (`StepControls`, `PlayerControls`, and the `Diagram` and `PacketLayer` parts), each control with
  a story in both themes. `MetricsRow`, `Takeaways`, `CodeBlock` and the rest come in M3, when the
  first lesson needs them.
- The subtle hover states stay.
- `/dev/components/` stays until M6.
- `--on-signal` is added in M3, with a contrast test, when the first scene needs it.

## D11. Lesson engine choices the spec left open (2026-11-26)

No dependency was added in M2. Everything below is a choice the spec did not settle.

**Scheduling and time**

- **One timeline, one timer, one pointer.** Frames are not scheduled with a timer each. A sorted
  list with a pointer means an event runs exactly once, and in order, even if a timer fires
  late. Pause and resume only store and restore elapsed time (`src/engine/timeline.ts`).
  Alternative: a timer per frame, as the prototype does with a `_done` flag on each frame.
- **Packets expire on the same timeline.** A packet leaves `activePackets` at `at + 900 ms`, as
  an event on the injected clock, not when its animation ends. Pause, replay and the tests then
  need no knowledge of the Web Animations API, which only draws.
- **A frame at `at: 0` runs on the first timer turn, never synchronously.** The first paint is
  then always the start state, and React StrictMode's second effect run cannot apply a frame twice.
- **A stale timer cannot change a new step.** Frame and expiry actions carry the run they were
  scheduled for, and the reducer ignores any other. This closes the gap between a step change
  and the cleanup of the old timers.

**The hook**

- **The state is computed on entry, in the reducer, not in an effect**, so no render shows a new
  step with the old step's state, and the server HTML is the start state.
- **Changing lesson or motion setting restarts during render** (the "adjust state while
  rendering" pattern), so there is no frame with a mismatched step. Pass `key` anyway where a page
  switches lessons.
- **`goTo` clamps** an index outside the lesson and ignores a non-number. `goTo` to the step that
  is showing starts it over (the prototype does the same when the current dot is pressed).
  `next` on the last step and `back` on the first do nothing; what the last step's button does
  (restart, or the next lesson) is the page's decision, through `StepControls`' `onNext`.
- **Extra return values:** `step`, `stepCount`, `metrics` and `reducedMotion`, next to the nine in
  the spec. **Options:** `clock`, `reducedMotion` (an override for tests) and `keyboard`.
- **Keys beyond the spec:** ignored while typing in a field, with Ctrl, Meta or Alt held, for a
  held key's repeats, and when another handler already took the event. Space is "left to a
  button or link" for any element that is natively or by role a button or link, summaries
  included. Only Space has its default action stopped.
- **Reduced motion** shows the final state on entry, disables Pause (nothing to pause) and keeps
  Replay. It is read through `useSyncExternalStore` with a full-motion server snapshot, so a visitor
  with the setting sees the start state for the moment before hydration.
- **Not in M2:** ticking takeaways for visited steps (M3, from `stepIndex`) and saving progress in
  `localStorage` (M4, "saved progress"). The spec lists both under playback rules, but its hook
  returns neither, and they need the lesson shell.
- **Summary tables are not rendered yet.** `Step.summary` is in the types and the engine plays a
  step that has one, but nothing draws a verdict table until the lesson shell (M3), and the dummy
  lesson has none.

**Packets and the diagram**

- **Scenes never see packets.** `Diagram` owns the `<svg>` (viewBox, `role="img"`, the step's
  `sceneAlt` as `aria-label`) and draws the scene and a `PacketLayer` inside it. A scene is then
  only "state in, SVG out", and every scene gets packets, pausing and clean-up for free.
- **The step card's live region holds the step text only**, not the buttons, so a screen reader
  announces the new step and not the controls each time.

**Validation**

- **More rules than the six in the spec:** a lowercase-hyphen slug, unique slugs and orders,
  `at` a finite number of 0 or more, no empty title, key idea, body paragraph or takeaway, a
  `shortTitle` on every step but the last, and that every takeaway is ticked by some step (one
  nobody ticks could never be completed).
- **Coming-soon stubs** are checked only for slug, order and title, and must have no steps. They
  still have to fill the other `Lesson` fields. A `ComingSoon` type would be cleaner; that is an
  M4 question, because it changes the data model of the spec.
- **The registries are empty in M2.** `content/lessons/lessons.test.ts` therefore passes without
  checking a lesson yet; the rules are proven by `src/engine/validate.test.ts` with broken
  lessons, and the dummy lesson is validated by `content/dev/dummy-lesson.test.ts`.

**The test page and tests**

- **`/dev/player/` ships in the export**, `noindex`, as `/dev/components/` does, because the
  end-to-end tests run against the export. Revisit both in M6.
- **The dummy lesson is in `content/dev/`, its scene in `scenes/dev/`**, outside both registries, so
  it cannot reach the catalog and the engine and registry stay free of test material.
- **Playwright drives the page with a frozen clock** (`clock.install`, `pauseAt`, `runFor`), so a
  frame fires when the test says and not when the machine gets there. axe needs the clock
  running, so those tests pause the player first and resume the page clock.
- **`testClock.ts` and `testLesson.ts` sit in `src/engine/`** because several test files share
  them. Only tests import them, so they are never in a bundle.

## D12. Lessons 1 and 2, and the owner's answers to the M2 questions (2026-11-26)

No dependency was added in M3. Owner answers, recorded:

1. **`onPastEnd`.** `useLessonPlayer` takes an optional `onPastEnd` callback, called when the right
   arrow is pressed on the last step. The Next button is not affected: the page owns it. Unit
   tested. M3 passes none, so the arrow does nothing on the last step; M4 wires it to the next lesson.
2. **Coming-soon stubs.** In M4 the catalog uses a separate `CatalogEntry` (`slug`, `title`,
   `summary`, `track`, `status: 'ready' | 'soon'`). `Lesson` is for playable lessons only. The
   `status` field and the coming-soon rules in `Lesson` and `validate.ts` (D11) go in M4. SPEC.md
   describes the target now. SPEC.md in the repo is the living copy of the spec.
3. **Two-lesson floor.** `content/lessons/lessons.test.ts` fails if fewer than two lessons are registered.
4. **Verdict tables** (`Step.summary`) are drawn by the lesson shell, in place of the diagram.
5. The three differences from the prototype that were proposed in M2 are accepted.

Choices the spec did not settle:

- **`--on-signal` and the solid fills.** Text on a filled signal colour is `--on-signal` (white in the
  light theme, the dark paper colour in the dark theme). `--bad` and `--ev` reach 4.5:1 with it as
  they are, in both themes. The light theme's `--req` (3.8:1) and `--res` (4.4:1) do not, so a fill
  that carries text in those colours is `--req-solid` or `--res-solid`: the colour with 15% `--ink`
  mixed in, which is 4.5:1 or better in both themes and close to the signal colour. Used on the
  toast (`--bad`), the Like button and the pending badge (`--req-solid`). `contrast.test.ts` holds
  every pair. Alternatives: white on the raw `--req` (fails AA), or a second text colour per fill.
- **Scenes carry their labels in the state.** "BROWSER", "socket {status}", the document names and
  the words of the metrics are fields of the scene state, set in `baseState` of the lesson, because
  scenes may not hold visible text. Templates (`{label} · {ms} ms`) go through `format`. The metrics
  the scene shows are `Metric` values in the state (scene 1) or computed from it (scene 2), so
  nothing compares a displayed word such as "yes".
- **`LessonShell` is a client component with a header slot.** The cards around the diagram all
  depend on the player's state, so the shell runs `useLessonPlayer`. The static header (breadcrumb,
  title, chips, summary) is `LessonHeader`, rendered by the page on the server and passed in as a
  prop, so the text still ships as server HTML. The shell finds its scene in the registry, or takes one
  as a prop (the dummy lesson is not in it).
- **`Stepper` is split from `StepControls`.** The prototype puts the dots under the diagram and Back
  and Next in the step card. `StepControls` is now Back, Next and the key hint, and takes `stepCount`.
- **The verdict table is an HTML `<table>`**, not SVG: a screen reader can move through it by row,
  and axe can measure its text. It has the diagram's aspect ratio and minimum width, so nothing moves
  when the step changes. The step's `sceneAlt` describes it. It does not scale its text with the width,
  as the prototype's SVG table did.
- **Takeaways tick from the furthest step reached** and stay ticked on the way back, as in the
  prototype. Each item also says "reached" or "not reached yet" to a screen reader, so the box is not
  the only signal. Saved progress is M4.
- **`shortTitle` keeps the prototype's meaning:** the step's own `short` is the label of the Next
  button that leaves it, so it names the step that comes next. SPEC.md now says so.
- **Routes.** `/lessons/[slug]` with `generateStaticParams` and `dynamicParams = false`, inside a
  temporary frame (`src/app/lessons/LessonsFrame.tsx`: brand, a link per lesson, theme toggle, credit
  line). M4 replaces the frame with the app shell. The breadcrumb's "of 2" counts the registry.
- **Slugs and track.** The second lesson's slug is `push-pull-sync` (the prototype used `push-pull`).
  Both lessons are in the track "Data and state", as the spec's table says; the prototype called it
  "State and updates".
- **`sceneAlt` sentences are new.** The prototype has none; they are written for this port.
- **Parity is tested, not eyeballed.** `content/lessons/prototype-parity.test.ts` loads
  `reference/prototype.html` in jsdom and compares text, tags, tones, step order, frame times, packets,
  the scene state after every frame, metrics and the verdict tables with the port.
- **e2e details.** A `waitForHydration` helper keeps key presses from racing the page load (the
  player listens for keys only once hydrated; a dummy-lesson test failed once under load). The axe
  helper also ignores axe's "too short to judge" verdict for single-character SVG text (the badge
  digit); `contrast.test.ts` covers that pair. Axe runs on the final state of every step, using reduced
  motion to reach it at once, plus once with a packet in flight.
- **Numbers in diagrams** are labelled simulated by the footer line ("Latencies in the diagrams are
  simulated.") and by step 1's text, as in the prototype. Open question for the owner: also in the diagram.

## D13. App shell, and the owner's answers to the M3 questions (2026-11-26)

**Dependency added in M4**

| Package     | Version | Reason                                                                                                                                                                                      |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@lhci/cli` | 0.16.1  | Lighthouse CI, which the spec asks for: it runs Lighthouse (13.6.0, bundled) several times per page and asserts the budget, which neither Playwright nor a few lines of script can replace. |

It is a dev dependency: it runs only on a machine or in CI and ships nothing. Alternatives: the bare
`lighthouse` package with my own assertions and median logic (more code to maintain), or measuring
with Playwright (no real Lighthouse score). It adds about 240 packages to the lockfile.

**Owner answers, recorded**

1. A "Simulated" pill (text in `messages/en.json`) sits next to the metrics row, outside the diagram.
   It is shown on every lesson. The footer line and step 1's text stay.
2. On a lesson with a next lesson, the last step's button reads "Next lesson: <title> →" and the right
   arrow goes there through `onPastEnd`. With none, the button stays "Restart lesson". Today only lesson
   1 has a next lesson, because "next" means the next _playable_ lesson: lesson 2 keeps "Restart lesson"
   until lesson 3 ships.
3. The breadcrumb says "Lesson N of 12", counting the catalog.
4. The prototype differences 6 to 10, 13 and 15 to 20 are accepted. Item 14 (time markers) is fixed to
   match: a marker that goes away fades out where it stands and keeps its text, with the prototype's
   easing (`ease`) and fade (0.3 s), and starts from x = 0. **One caveat:** to fade "where it stands" the
   marker remembers its last position and text (`useState` in `OptimisticUiScene`), because a pure
   function of the state cannot know where a hidden marker used to be. What it remembers is invisible
   (opacity 0), so the picture still depends only on the state, and a test checks it. If you want scenes
   to hold no state at all, the alternative is the M3 behaviour (slide to the edge, empty label).

**Data and engine**

- `CatalogEntry` is in `src/engine/types.ts` next to `Lesson`. `Lesson.status` and the coming-soon rules
  in `validate.ts` are removed, as D12 said (the only engine change besides `onPastEnd`, and it is a
  type and a validation rule, not playback).
- Slugs for the ten coming-soon lessons are chosen here, since the M5 branches and URLs depend on them:
  `virtualization`, `normalized-data`, `rendering-isolation`, `state-ownership`, `requirements-first`,
  `container-view-viewmodel`, `backend-for-frontend`, `progressive-rendering`, `permission-aware-ui`,
  `errors-and-observability`. Their summaries are new, in original words.
- The catalog repeats a ready lesson's title, summary and track instead of importing them, so the
  catalog stays a plain list; `catalog.test.ts` fails if the two differ.

**Routes and shell**

- **Route group `(site)`** holds the catalog and lessons with the shell; `/dev/` stays outside with its
  own bare frames. The 404 page wraps itself in the shell (Next.js renders it under the root layout only).
- **Header:** brand (a link home), "All lessons", "Source code" (the repository), theme toggle, and a
  skip link. **Footer:** the spec's credit wording with both links live, "Latencies in the diagrams are
  simulated.", and the licences (MIT, CC BY 4.0, the fonts' SIL OFL 1.1). Brand and link text are in
  `messages/en.json`.
- **Catalog layout:** cards grouped by the four tracks, in a fixed track order, lessons in lesson
  order inside each. So the numbers on the cards are not consecutive on screen (01, 02, 04, 06, 09 in
  "Data and state"). Grouping by track is what the spec asks for; say if you would rather show one list
  in lesson order.
- **A ready card** is one link (its title, stretched over the card, with a 2 px ring on the card when it
  has keyboard focus). **A coming-soon card** has no link, a dashed border and the words "Coming soon".

**`?step=N`**

- Counts from 1. Read **after hydration** in an effect, because a static export cannot see the query when
  it builds; the server HTML is always step 1 and a deep link jumps a moment after first paint. Measured
  layout shift of that jump: 0.003 (desktop) and 0.001 (phone), well under the 0.1 "good" line.
- A whole number outside the lesson is clamped. A value that is **not** a whole number (`abc`, `2.5`, an
  empty value, `1e2`) is ignored, as if absent: there is no sensible step to clamp it to.
- The address is rewritten with `history.replaceState` as the learner moves, keeping other parameters and
  the hash. **Step 1 has no parameter**, so the plain lesson address stays the clean, canonical one. The
  canonical URL never carries a query string.
- A lesson opened without `?step=` starts at step 1. It does **not** resume where the learner left off;
  saved progress fills in the takeaways and the catalog, and a link can carry a step. Say if you want
  resume.

**Saved progress**

- One key, `pl-progress`, versioned (`v: 1`): per lesson the furthest step reached, the ticked takeaways
  and `completed`. Reaching the last step completes the lesson, and it stays completed. Progress only
  moves forward. Unknown versions and malformed entries are dropped on read (never thrown), so a future
  format change is a version bump.
- Applied after hydration through `useSyncExternalStore` with a "nothing saved" server snapshot. The
  catalog card reserves the height of its progress line, so progress arriving does not move the card
  (an e2e test measures it). Opening a lesson counts as starting it: the card then says "Step 1 of N".
- The ticked takeaways are the union of the saved ones and those of the furthest step reached this visit,
  so they still show when storage is blocked.

**Metadata and crawler files**

- Title format `<page> · Frontend Pattern Lab`, bare site name on the catalog. Canonical paths end in a
  slash (how the export serves them). Open Graph: `type`, `siteName`, `locale`, `title`, `description`,
  `url`. **No `og:image` yet:** the spec puts social preview images in M6.
- `sitemap.xml` (catalog and the two ready lessons, no `lastmod`, since there is no trustworthy date) and
  `robots.txt` are generated at build time with `dynamic = 'force-static'`; the export supports both.
  **`/dev/` is `noindex` and left out of the sitemap, but not blocked in `robots.txt`:** a page crawlers may
  not fetch can never show them its `noindex`, so blocking could keep it listed by address. The 404 page
  gets Next.js's own `noindex`.

**Performance**

- **Measured on the static export**, served by `scripts/serve-out.mjs`, which now gzips text files (once,
  at start-up), as a host does; without it the numbers would count bytes no visitor downloads.
- **Lighthouse:** the mobile profile (a 412 px screen, 4x CPU slowdown, simulated slow 4G), **five runs per
  page, the median of each metric asserted** (`aggregationMethod: 'median'`). The first run of a batch was an
  outlier in two of two trials (total blocking time 309 and 1323 ms against 31 to 81 ms for the rest), which
  failed an assertion on one run; I have not found the cause (cold browser or machine), so the median over
  five runs is what keeps one cold run from failing the build. Treat it as a risk to watch in CI.
- **JavaScript budget:** `scripts/js-budget.mjs` gzips (level 9) every script a browser fetches for a page,
  ignoring the `nomodule` polyfill (38.7 KB gzipped, which no current browser fetches). The framework alone
  is 139 KB gzipped, so "the catalog ships almost no JavaScript" is true of our code (the catalog's own chunk is
  about 1.5 KB) but not of the page: the App Router's React and client runtime cannot be avoided.
- **CLS while playing:** `e2e/layout-shift.spec.ts` plays every step of both lessons, on desktop and phone,
  and requires the standard CLS to be exactly 0. Changing a step does reflow the page a little (the step
  card's height changes and the takeaways card moves: 0.06 to 0.08 on desktop, 0.001 to 0.002 on phone). The
  CLS metric ignores shifts within 500 ms of a key press or click, so it does not count; the spec's
  "no layout shift while a lesson plays" is met by that definition. It would not be by a stricter reading.
  Reserving the step card's height would remove it.
- **A favicon** (`src/app/icon.svg`, the header's two-dot mark, light and dark variants through a media
  query) was added because the missing `/favicon.ico` was a 404 and a console error on every page load,
  which cost best practices 4 points (96 to 100). Hard-coded hex values are in the SVG because a favicon
  cannot read the page's CSS variables; they are the token values. Social preview images are still M6.

## D14. M5 preparation, and the owner's answers to the M4 questions (2026-11-26)

No dependency was added: `next/dynamic` is part of `next`. `src/engine/` is unchanged (`git diff main --
src/engine` is empty). Owner answers, recorded:

1. **Scene state.** A scene holds no `useState`. "Fade where it stands" is expressed in lesson data (below).
2. **Per-lesson loading:** done now.
3. **The step card's height is reserved.**
4. **Catalog:** one list in lesson order, consecutive numbers, the track as a label on each card.
5. **Lighthouse:** the median of 5 stays; nothing was loosened. If CI fails on performance, rerun first.
6. D13's decisions are accepted.

**Scene state (changes D13, item 4).** `OptimisticUiState` has `uiShown` and `serverShown` next to `uiAt` and
`serverAt`. A marker that is not shown keeps its position in the state, so it fades out where it stands and
keeps its text, with the prototype's easing and fade; the scene's `Marker` is a pure function of the state, and
a test draws the same SVG for the same state whatever came before. The engine rebuilds the state on every
step, so each step says where the markers stood when the step before it ended, in its `startState`
(`markersLeftAt(uiAt, serverAt)`); a test checks every step against the step before. A marker that has never
been placed waits at x = 0 with no text, as in the prototype. No chain of "hide, move, show" frames was needed:
a patch that sets the position and `shown: true` together slides and fades in at once, as the prototype's
marker does.

- **Accepted difference.** The prototype keeps a marker's position in the page, so after any move it fades out
  where the _previous visit_ left it. The port fades it out where the _step before_ left it. These are the same
  when the learner steps forward, which is how the lesson is read. After going back or jumping, the marker
  fades out while gliding to where the earlier step left it (0.3 s fade, 0.5 s slide). I think that is
  negligible; if you do not, the M3 behaviour is the alternative. The parity test compares what is visible: a
  marker that is not shown counts as `null`, as in the prototype.

**Loading (per lesson).** `next/dynamic` over a scene file makes a chunk of its own, preloaded by the pages that
render it. Passing the scene from the server page as a client reference was tried first and does not split:
Next.js chunks client modules per route, so both lessons, which share `/lessons/[slug]`, got one chunk.

- `content/lessons/index.ts` holds a loader per lesson; `loadLesson(slug)` reads one lesson. The lesson page
  loads its own lesson.
- `src/components/scenes/registry.ts` holds `{ load, View }` per `sceneId`. `View` is the lesson shell with
  that scene, loaded on demand (`bindScene`). `LessonRoute` renders the view of its lesson's scene. The scene
  is still in the server HTML, so the first paint shows the start state in full, and the space is reserved.
  `LessonShell` takes the scene as a required prop and no longer imports the registry.
- The catalog, the sitemap, `generateStaticParams` and "next lesson" read the catalog entries only. The ready
  entries now hold `minutes` and `stepCount`, as `ReadyEntry` in `content/lessons/catalog.ts` (so the engine's
  `CatalogEntry` is unchanged). A test fails if they differ from the lesson. `nextLessonAfter` moved from
  `index.ts` to `catalog.ts` and returns an entry.
- Each registry entry names the scene file twice (`load` and `View`), each with a literal `import()`, because
  `next/dynamic` only splits an `import()` it sees in its own call. The extra cost is 0.1 KB.
- **Adding a lesson is still one data file, one scene and one line in each of the two registries,** plus
  switching the catalog entry to `ready` with `minutes` and `stepCount`. That is one more number pair in a
  place you edit anyway; it is not a single registry line (see the questions in the pull request).

**JavaScript per route, from the static export** (gzipped, level 9, what a browser fetches):

| Route                      | Before (main, M4) | After (this branch) | Of which the page's own scene |
| -------------------------- | ----------------- | ------------------- | ----------------------------- |
| `/` (catalog)              | 139.2 KB, 8 files | 139.2 KB, 8 files   | none                          |
| `/lessons/optimistic-ui/`  | 147.1 KB, 9 files | 148.5 KB, 10 files  | 1.5 KB, 1 file                |
| `/lessons/push-pull-sync/` | 147.1 KB, 9 files | 148.4 KB, 10 files  | 1.4 KB, 1 file                |

Both lesson pages are **1.3 to 1.4 KB larger** than before, so the headroom under 150 KB fell from 2.9 KB to
1.5 KB. The split costs a fixed amount per page (the dynamic-import runtime, one more file, the step card's
reserve), and in exchange a scene no longer costs every page. Before, every page carried every scene (about
1.5 KB each), so a page with the twelve lessons' scenes would have been about 15 KB over the two it has now,
which is past the limit; after, it carries one. That figure is an estimate from the two scenes' sizes, not a
measurement. **The headroom is thin:** a new scene bigger than about 3 KB gzipped (twice the size of lesson 1's)
would fail the check. See the questions in the pull request.

**The budget is a check in CI.** `scripts/js-budget.mjs` (`pnpm budget`, its own CI step right after the
build) reads the export: the catalog is `index.html` and every `lessons/<slug>/index.html` is a lesson page,
so a new lesson is measured without editing the script. It fails a lesson page over 150 KB and a lesson page
with no JavaScript file of its own (the scenes would be bundled together again). The catalog has no limit
(reported only, as before; the spec says only "close to zero client JavaScript of its own"). A test runs the
script on fake exports. `vitest.config.mts` now includes `scripts/**/*.test.ts`. `pnpm lighthouse` still
runs it at its end.

**The step card does not change height (changes D13, "CLS while playing").** Invisible copies of every step
share the visible step's grid cell, so the card is as tall as the tallest step at any width, in CSS, with
the height already in the server HTML. The copies are `invisible`, `aria-hidden`, `inert` and outside the live
region, so a screen reader reads each step once, as it did (the live region still holds the visible step only).
The alternatives were measuring in JavaScript (the first paint would still shift, and measuring needs
the text laid out) and a fixed `min-height` (it cannot know how the text wraps on each screen). Two more
reserves were needed and are done the same way: the Next button's label (it wraps to two lines on a phone on
some steps, which moved the takeaways by 23 px), and the verdict table's height under the diagram (the table
is taller than the diagram on a phone). `e2e/step-card.spec.ts` plays both lessons at 1280 and 390 px wide and
checks that the card, its buttons, the takeaways, the footer, the diagram card and the page height do not
move at any step; I checked that it fails without the reserve. The strict layout-shift total while playing
fell from 0.06 to 0.08 on desktop to 0.004 to 0.010, which is the new text replacing the old inside the card
(the key-idea box moves), not anything around it.

- **A cost:** the page's HTML holds each step's text twice, once visible and once as the copies (a few KB;
  they compress). Tests that look for step text with `getByText` must look inside the live region, because the
  copies hold the same words; the two e2e helpers that did were changed.

**Catalog (changes D13, "Catalog layout").** One `<ul>` in lesson order, numbered 01 to 12 with no gaps. The
track is a `Chip` at the bottom of every card, ready or not, with "Track:" for a screen reader. The track
section headings are gone; a visually hidden `h2` "All lessons" keeps the heading order (h1, h2, then the
cards' h3), and the list is labelled by it. `catalog.trackLabel` in `messages/en.json` became `catalog.track`.

**Lighthouse** (mobile profile, median of 5, nothing loosened): catalog and lesson 1 both performance 100,
accessibility 100, best practices 100, LCP 0.75 s, CLS 0.000; total blocking time 31 ms and 14 ms.

## D15. Lesson 3, Virtualization, and the owner's answers to the M5 prep questions (2026-11-26)

No dependency was added. `src/engine/` is unchanged (`git diff main -- src/engine` is empty). Owner answers,
recorded:

1. The 150 KB lesson limit stays, and app code is not trimmed to fit. A lesson that breaks it stops the work
   and the numbers are reported.
2. One data file, one scene, two registry lines and the catalog entry per lesson: accepted.
3. The time marker difference when going back (D14): accepted.
4. **The catalog has a limit of 145 KB** of gzipped JavaScript in `pnpm budget` (it loads 139.2 KB, all
   framework). The CI step's name says so; a test covers it.
5. The reserved step card height and the step text repeated in the HTML (D14): accepted. **The metric
   labels cut off on a phone are fixed** (below).

**Metric labels on a phone.** A label now wraps instead of being cut off ("CLIENT VS…"), and the value sits at
the bottom of its tile, so the three values stay level when one label takes two or three lines. Wrapping was
chosen over shortening: shortening would change lesson 2's data and break the prototype parity test, which
compares the metric labels with the prototype; and later labels such as "Time to first useful content"
(lesson 10) cannot be cut to fit a 90 px tile. No lesson data changed. `e2e/metric-labels.spec.ts` opens every
ready lesson at 375 px and fails if a label is wider than its box or sticks out of the tile; it failed on
`main` before the fix.

**Lesson 3, choices the spec did not settle**

- **Seven steps, not six.** The outline's six, plus "Or let the browser skip the work" (CSS containment,
  `content-visibility: auto`) as step 5, because the owner asked for containment in the scene and it is the
  lighter tool the verdict table points to. It comes before the costs of a window, so the summary can weigh
  both.
- **The scene draws a simulation**: eight row slots (two overscan rows, four in the viewport, two overscan
  rows) and a block above and below that stands for the rest of the list, whatever the counts. The row
  numbers, the blocks' counts, the spacers' pixel heights, the scrollbar thumb and the DOM panel's counts are
  computed from the state (`total`, `loaded`, `first`, `mounted`, `spacers`, `rowPx`, `nodesPerRow`). The
  viewport's place in the slots is a constant of the drawing, as a panel's position is; everything a lesson
  may want to move is in the data.
- **Layout** follows lessons 1 and 2: the browser on the left, a lane, panels on the right (API above, DOM
  below), the viewBox 640 wide. Colours keep their meaning: orange for the viewport (what the user sees),
  red for rows mounted but unseen and for the costs, teal for a window's DOM count and for containment,
  grey for overscan and spacers.
- **Numbers.** 10,000 rows, 50 per page, 40 px per row and about 6 nodes per row are illustrative; the
  drawing says "illustrative numbers", and step 1 says the counts are illustrative and the render cost
  simulated. The render cost is a metric written in the lesson data (as lesson 1's are), the other two are
  computed by the scene. The DOM count is marked bad above `nodeBudget` (1,500 nodes) and good in a window.
- **Code samples are `tsx`.** `Step.code` allows `ts`, `tsx` and `json`; adding `css` would change the engine
  types, so the containment sample is written as a React `style` object.
- **The API heading is `/items`**, not `GET /items`, so the request packet's label is not drawn twice.

**Tests, reusable for the next lessons**

- `e2e/lesson-03-virtualization.spec.ts` plays the lesson; the shared steps are in `e2e/lesson-helpers.ts`
  (frozen clock, metrics, verdict table, axe on every step and with a packet in flight). Later lessons copy
  the spec.
- `e2e/step-card.spec.ts`, `e2e/layout-shift.spec.ts`, `e2e/shell.spec.ts`, `content/lessons/catalog.test.ts`
  and the catalog page test now read the ready lessons from the catalog instead of naming two, so a new
  lesson does not edit them. Lesson 2's last step now says "Next lesson: Virtualization →".
- `pnpm screenshots <slug>` (`scripts/lesson-screenshots.mjs`) saves every step in both themes at 1280 and
  375 px to `../pattern-lab-screenshots/<slug>/`, outside the repository.
- `LIGHTHOUSE_LESSON=<slug> pnpm lighthouse` adds that lesson's page to the Lighthouse run. CI still measures
  the catalog and lesson 1 only, to keep its run time.
- The "New lesson procedure" in `docs/ADDING_A_LESSON.md` holds the whole checklist; `CLAUDE.md` points to it.

**JavaScript per route, from the export** (gzipped, level 9):

| Route                      | Before (main) | After (this branch) | Of which its own scene |
| -------------------------- | ------------- | ------------------- | ---------------------- |
| `/` (catalog)              | 139.2 KB      | 139.2 KB            | none                   |
| `/lessons/optimistic-ui/`  | 148.5 KB      | 148.6 KB            | 1.5 KB                 |
| `/lessons/push-pull-sync/` | 148.4 KB      | 148.5 KB            | 1.4 KB                 |
| `/lessons/virtualization/` | none          | 149.3 KB            | 2.2 KB                 |

The new page passes with **0.7 KB** to spare. Every lesson page also grew by 0.1 KB: the scene registry is in
the code every lesson page shares, and each entry adds a `next/dynamic` wrapper. At that rate the nine lessons
still to come add about 0.9 KB to every page, so a lesson 12 scene the size of this one (2.2 KB) would come
to about 150.2 KB, over the limit. This is a projection, not a measurement. See the open questions in the
pull request.

## D16. One route per lesson, so a lesson page ships only its own scene (2026-11-27)

No dependency was added. `src/engine/` is unchanged (`git diff main -- src/engine` is empty). Owner answers to
the lesson 3 questions, recorded:

1. **Split the registry** so that each lesson page ships only its own scene's entry: done, as below.
2. The scene style of lesson 3 is accepted for lessons 4 to 6.
3. The containment step stays: lesson 3 keeps seven steps.

**What was wrong.** Every lesson page loaded the whole scene registry: one `next/dynamic` wrapper per scene
and the loaders of every scene's chunk, in the code all lesson pages share. Each entry was in fact two chunks,
not one: `load` and `View` each got a chunk of their own, so the comment that said "one chunk per scene" was
wrong, and both loaders shipped.

**What I proposed in the lesson 3 pull request does not work.** I suggested that the server page pass only
its own scene's view. I tried it in two forms, and in both, every scene ended up in every lesson page:

- the scene module made a client module, loaded with `import()` on the server and passed to the player
  (0 files of its own per page, 148.7 KB each);
- `next/dynamic` called on the server, over one small client view per scene (0 files of its own, 150.2 KB
  each, over the limit).

Turbopack bundles every client module that one route can reach into that route's shared chunks, wherever the
import is written. D14 had seen this with the first form. So on a single `/lessons/[slug]` route, only a map
in client code can give each page its own chunk, and that map reaches every page.

**What was done: a route folder per lesson.** `src/app/(site)/lessons/[slug]/` is replaced by one folder per
lesson, `src/app/(site)/lessons/<slug>/page.tsx`. Each page file imports the lesson's data and its scene and
passes them to `lessonPage` (`src/app/(site)/lessons/lessonPage.tsx`), which renders the header and
`LessonRoute` as the old page did. Each route is bundled on its own, so a lesson page's JavaScript holds its
own scene and nothing that names another, and `next/dynamic` and `bindScene` are gone. The URLs, the HTML, the
sitemap and the next-lesson links are unchanged. The lesson route was allowed to change; nothing else on the
page changed.

- **Scene files start with `'use client'`**, with a comment saying why. On the server the scene is then a
  client reference, which the page passes to `LessonRoute` as a prop, as D14 first tried. Scenes stay pure.
- **`lessonPage<S>(lesson: Lesson<S>, scene: SceneDefinition<S>)`** only accepts a lesson and a scene with
  the same state type. It throws for a lesson whose catalog entry is not ready, which fails the build.
  `lessonMetadata(lesson)` gives the page's metadata from the catalog, as `generateMetadata` did.
- **The registries are gone; the page file is the registration.** `content/lessons/index.ts` (the lesson
  loaders) is deleted. `src/components/scenes/registry.ts` now reads every page file with Vite's
  `import.meta.glob` and gives `lessonPages`, `lessons` and `sceneRegistry`, for tests and tools only.
  The app never imports it. The engine's `sceneId` comment still points at it, and validation still checks
  `sceneId` against it. Its type comes from `vite/types/import-meta.d.ts`, so Vite's asset typings do not
  reach the app.
- **Adding a lesson is simpler:** one data file, one scene and one page file (copy the previous one and
  change two imports), plus the catalog entry. The two registry lines are gone. A ready entry with no page
  fails `pnpm test`; a page whose entry is not ready fails the build.

**The check: a lesson page carries its own scene and no other.** `pnpm budget` reads which scene each lesson
page renders from the build's client reference manifests (`lessons/<slug>/page_client-reference-manifest.js`
under `.next/server/app`, which lists `src/components/scenes/<Name>Scene.tsx` with its module id).
It then looks for every scene's module in the JavaScript each page loads, where the bundler writes it as
`,<id>,e=>{`. It fails:

- a lesson page that carries another lesson's scene;
- a lesson page that names a file holding another lesson's scene, which is what a map of loaders does;
- a lesson page that does not carry its own scene, or whose page imports no scene or two (the check would
  otherwise be blind);
- the catalog carrying or naming any scene;
- a build with no manifest for a lesson page.

I broke the split two ways on a real build to check that it fails: a shared client module importing one scene
("includes another lesson's scene") and the same module able to `import()` it on demand ("can load another
lesson's scene"). Both failed with the page and the scene named. `scripts/js-budget.test.ts` covers each case
with fake builds. The check reads Next.js's build files, so a change in how Next.js writes them could break
it. If that happens it fails ("no client reference manifest", "does not include its own scene"); it does not
pass silently.

**JavaScript per route, from the export** (gzipped, level 9):

| Route                      | Before (main)      | After (this branch) | Of which its own file   |
| -------------------------- | ------------------ | ------------------- | ----------------------- |
| `/` (catalog)              | 139.2 KB, 8 files  | 139.2 KB, 8 files   | none, and no scene      |
| `/lessons/optimistic-ui/`  | 148.6 KB, 10 files | 146.3 KB, 8 files   | 8.7 KB (before: 1.5 KB) |
| `/lessons/push-pull-sync/` | 148.5 KB, 10 files | 146.3 KB, 8 files   | 8.6 KB (before: 1.4 KB) |
| `/lessons/virtualization/` | 149.3 KB, 10 files | 147.1 KB, 8 files   | 9.4 KB (before: 2.2 KB) |

Every lesson page is **2.2 to 2.3 KB lighter**: the registry, the `next/dynamic` runtime and one file are gone.
A new lesson now adds nothing to the other pages. Lesson 3 has 2.9 KB to spare instead of 0.7 KB. The other
pages carry about 144.8 KB besides their scene, so a scene of up to about 5 KB gzipped (twice lesson 3's)
fits. That is an estimate from these numbers, not a measurement.

- **A cost:** a page's own file is now larger, because it holds the lesson shell as well as the scene. The
  shell is in each route's file and not in a file the lesson pages share, so going from one lesson to the next
  in the browser downloads about 8.6 KB instead of about 1.5 KB. The first visit to any lesson is 2.2 KB
  lighter. I think that is the right trade for a site that people mostly open one lesson at a time.

## D17. Lesson 4, Normalized Data (2026-11-27)

No dependency was added. `src/engine/` is unchanged (`git diff main -- src/engine` is empty). The lesson is
one data file, one scene, one page file and the catalog entry, as D16 describes; nothing else in `src/` or
`content/` changed.

**Choices the spec did not settle**

- **Six steps, the outline's six.** Repeated user, stale rename, store by id, one write, what a query library
  leaves to you, and the test question (the verdict table).
- **The scene is a small simulation**: one user (`u1`, "Mira Lund", renamed to "Mira Vale") and three places that
  mention them. Three columns as the outline says: the nested response on the left, the store in the middle,
  three views (feed, profile, comments) on the right. The store shows one copy of the user per response, or one
  `users` record with three references (a spine joins each reference to the record). Below the response is an
  update card (the rename the server announces); below the views is a cache-plan panel that only step 5 lights.
- **"Stale" is a word, not only a colour.** A stored copy, the record or a view whose name differs from the
  server's (`latest`) is drawn in red with a `STALE` tag, so the state does not rest on colour alone.
- **The rename is stale from the moment the server announces it**, not from the moment the store gets it. In step
  2 and step 4 the copies and the views read STALE while the `rename` packet is in flight, which is the honest
  picture ("the browser is behind"). In step 4 that is what lets one packet visibly fix all three views.
- **Metrics follow the outline** (copies of the user, views in sync, writes needed), all computed from the state,
  so the lesson data holds no metric values. "Writes needed" is the number of stored places that do not hold the
  server's name yet: 0 before a rename, 3 then 2 in step 2 (one copy patched, two left), 1 then 0 in step 4. It
  is not the same number as the copies. A view that has not rendered yet is blank, not stale, so loading never
  shows "1 of 3" in red.
- **The store holds copies and a record separately** (`names` and `entity`) and the views hold what they show
  (`view`), so a packet from the store to a view has something to change. A step that starts in the by-id mode
  sets `names` to empty, so no stale copy hides in the faded-out half of the drawing.
- **Each step starts from a clean state, as in lesson 3.** Step 3 does not start from step 2's stale views,
  because normalizing a store that already disagrees would raise the question of which copy wins, which the
  lesson is not about.
- **Numbers and names.** The user, the id and the names are made up; the drawing says "illustrative data" and
  step 1's text says so. No source text or example from the article or the sample site is used: the user,
  the three-panel layout and the steps' wording are written for this project from the outline.
- **Code samples** are `ts` and `json` (four to six lines each), written for this project.
- **Verdict tones.** "Normalize" is `warn` (it needs an action and a design), "Keep nested" is `ok`, as lesson 3
  marks "Virtualize" `warn`.
- **Layout.** The viewBox is 640 by 380, a little taller than lesson 3's 352, for a bottom row (update card,
  user record, cache plan). Lanes: `load0` to `load2` (response to store, one per row), `write` (update to store)
  and `read0` to `read2` (store to views). Colours keep their meaning: teal for the server's data and the
  one record, violet for the update, red for stale and for the missing shared record.

**Tests**

- `src/components/scenes/NormalizedDataScene.test.tsx`: the three counts, the metrics and their tones, the stale
  words, the record and references, the plan, and the same picture for the same state.
- `e2e/lesson-04-normalized-data.spec.ts`: the whole lesson with the keyboard against a frozen clock (metrics and
  stale counts after the frames, the packets, the verdict table, back to step 1), the takeaways, Space and R,
  reduced motion, 375 px, and axe in both themes on every step and with a packet in flight. The shared checks
  (step card, layout shift at desktop and phone, metric labels at 375 px, catalog and next-lesson) pick the
  lesson up from the catalog.

**JavaScript per route, from the export** (gzipped, level 9):

| Route                       | Before (main)     | After (this branch) | Of which its own file |
| --------------------------- | ----------------- | ------------------- | --------------------- |
| `/` (catalog)               | 139.2 KB, 8 files | 139.2 KB, 8 files   | none, and no scene    |
| `/lessons/optimistic-ui/`   | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.7 KB                |
| `/lessons/push-pull-sync/`  | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.6 KB                |
| `/lessons/virtualization/`  | 147.1 KB, 8 files | 147.1 KB, 8 files   | 9.4 KB                |
| `/lessons/normalized-data/` | none              | 146.8 KB, 8 files   | 9.2 KB                |

No other page changed in size. The new page has 3.2 KB to spare.

**Lighthouse** (mobile profile, median of 5): the lesson page performance 100, accessibility 100, best practices
100, LCP 0.75 s, CLS 0.000, total blocking time 38 ms.

## D18. Lesson 5, Rendering Isolation, and the owner's answers to the lesson 4 questions (2026-11-27)

No dependency was added. `src/engine/` is unchanged (`git diff main -- src/engine` is empty). The lesson is
one data file, one scene, one page file and the catalog entry, as D16 describes; nothing else in `src/` or
`content/` changed. Owner answers, recorded: lesson 4's cache plan stays in step 5, and that step names no
library.

**Choices the spec did not settle**

- **Six steps, the outline's six.** The whole tree renders, move the state down, split a context, memoize on
  purpose, shrink a needed render (virtualization and containment), and separation against isolation (the
  verdict table).
- **The scene is a small simulation**: the component tree of a chat screen, seven components, drawn from left
  to right (root on the left), so the packets can travel along the middle row from `Input` up to `Form` and
  `App` on horizontal lanes. `App` holds `Header`, `Form` and `Thread`; `Form` holds `Input` and `Send`;
  `Thread` holds `Messages`. The tree's shape is a constant of the drawing, as lesson 3's row slots are; the
  names, marks, counts, notes and contexts are all lesson data. Below the tree: a change card and a context
  card (step 3 only). Beside it: lesson 3's bracket notes.
- **What rendered is a word, not only a colour.** Each box counts its renders in the step (`×2`) and, after a
  change, says what it did: `RENDERED` (orange border: it had something new to show, or it owns the state),
  `WASTED` (red: it rendered and drew the same thing), or `SKIPPED` (dashed: a memo boundary stopped it). A box
  with no word did not render.
- **The mark stays until the next change** instead of flashing and fading. The outline says the counter
  "flashes"; here the border and word fade in with the usual token transition and the count steps up. A mark
  that faded away would leave nothing in the final state, which is all that reduced motion shows; this way
  reduced motion shows exactly what rendered on the last change. A step that changes the structure (splitting
  the context, a stable callback, containment) clears the marks, so the next change starts from a clean
  picture and the metrics show "—" in between.
- **Metrics follow the outline** and are all computed from the state. "Rendered per change" and "Wasted
  renders" count the marks of the last change (wasted is rendered minus needed, as the owner suggested); "Where
  the state lives" is the owning component, or the context that holds the value. All three are red while the
  last change wasted renders and teal when it wasted none. The owner's own render counts as needed.
- **Names fit a phone.** At 375 px a metric value has 73 px, which is seven characters of the metric font. So
  the component that holds the field is `Form` (not `Composer`) and the contexts are `Global`, then `User` and
  `Inbox` (the code calls them `GlobalContext` and so on); and the first metric is "Rendered per change", since
  "Components" broke mid-word in a tile. The lesson's e2e test checks that every metric value fits its tile on
  one line at every step at 375 px; it failed with `Composer`. The shared metric test checks labels only.
- **Each step starts clean, with its own scenario**: the draft (steps 1 and 2), the unread count in a context
  (step 3), an online flag that `Header` and `Form` both need, so it has to stay in `App` (step 4), and new
  messages owned by `Thread` (step 5). In step 4 `Form` disables both the field and the button when offline,
  so every component outside the memo boundary really needs the change and the fixed version wastes nothing.
- **Step 5 is about a needed render.** The metrics do not move (2 of 7, none wasted); what changes is drawn in
  the bracket: 2,000 rows at about 90 ms, then 20 of 2,000 rows at about 4 ms in a contained section. Those
  numbers are simulated, and the drawing says "illustrative tree · simulated costs"; step 1 says so too.
- **No library is named.** The code uses React's own `useState`, `createContext`, `memo` and `useCallback`,
  which the lesson is about, and CSS `contain`; moving state down and splitting subscriptions are shown as
  patterns. Code samples are four or five lines, written for this project.
- **Verdict tones.** "Memoize it", "Window and contain" and "No runtime effect" are `warn` (each costs something
  or fixes nothing); moving state, splitting a context and leaving a cheap component alone are `ok`.
- **Colours keep their meaning**: orange for the work a change causes, red for waste, teal for where the state
  lives (the `state:` chip, the context that holds it, a memo boundary that works, a contained section), violet
  for changes that arrive from outside (an unread count, the connection, a new message), orange for typing.

**Tests**

- `src/components/scenes/RenderingIsolationScene.test.tsx`: the counts, the metrics and their tones, the words
  on the boxes, the memo and contain boundaries, the contexts and the bracket notes, and the same picture for the
  same state.
- `e2e/lesson-05-rendering-isolation.spec.ts`: the whole lesson with the keyboard against a frozen clock (metrics
  and marks after the frames, the packets, the verdict table, back to step 1), the takeaways, Space and R, reduced
  motion, 375 px (no sideways scroll, every metric value fits its tile), and axe in both themes on every step and
  with a packet in flight. The shared checks pick the lesson up from the catalog.

**JavaScript per route, from the export** (gzipped, level 9):

| Route                           | Before (main)     | After (this branch) | Of which its own file |
| ------------------------------- | ----------------- | ------------------- | --------------------- |
| `/` (catalog)                   | 139.2 KB, 8 files | 139.2 KB, 8 files   | none, and no scene    |
| `/lessons/optimistic-ui/`       | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.7 KB                |
| `/lessons/push-pull-sync/`      | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.6 KB                |
| `/lessons/virtualization/`      | 147.1 KB, 8 files | 147.1 KB, 8 files   | 9.4 KB                |
| `/lessons/normalized-data/`     | 146.8 KB, 8 files | 146.8 KB, 8 files   | 9.2 KB                |
| `/lessons/rendering-isolation/` | none              | 147.0 KB, 8 files   | 9.3 KB                |

No other page changed in size. The new page has 3.0 KB to spare.

**Lighthouse** (mobile profile, median of 5): the lesson page performance 100, accessibility 100, best practices
100, LCP 0.75 s, CLS 0.000, total blocking time 32 ms.

## D19. Lesson 6, State Ownership, and the owner's answers to the lesson 5 questions (2026-11-27)

No dependency was added. `src/engine/` is unchanged (`git diff main -- src/engine` is empty). The lesson is
one data file, one scene, one page file and the catalog entry, as D16 describes; nothing else in `src/` or
`content/` changed. Owner answers to the lesson 5 questions, recorded:

1. **The shared metric tile stays as it is.** The new lesson procedure now says a metric value is at most
   seven characters, so it fits a 375 px phone.
2. **The "value fits its tile" check is shared.** `e2e/metric-labels.spec.ts` now plays every step of every
   ready lesson at 375 px and fails if a value is wider than its tile or wraps. Lesson 5's spec keeps only its
   sideways-scroll check. All six lessons pass.
3. **The verdict table's verdict column off-screen on a phone** waits for M6: the line "Verdict table
   readable on a phone without sideways scrolling" is in `docs/PROGRESS.md`.

**Choices the spec did not settle**

- **The outline's scene, with the owner's two ideas inside it.** The owner suggested one screen with
  several kinds of state, the copies that drift when a value has two owners, and a derived value stored
  instead of computed, "if the outline agrees". The outline asks for five bins, a pile of items that sorts
  into them, and a click along a one-way path, so the scene follows the outline. The two ideas fit inside it:
  step 1's update path shows the filter with two owners (the store and the URL) drifting OUT OF SYNC and
  then held by TWO OWNERS, and the derived total is in step 2's text and the verdict table.
- **Six steps, the outline's six.** One global store, five homes, the promise each home keeps, the tool
  last, one direction, and "where does it live?" (the verdict table).
- **The scene is a small simulation** of one offers page with eight items: offers, filter, modal, theme,
  job, profile, draft, sort. Three bands: the global store (the pile), the five homes, and the update path.
  An item's home is one field (`home`); its chip's place is computed from it and slides there with a CSS
  transform (no transition with reduced motion). The layout is a constant of the drawing; every word is
  lesson data.
- **Words as well as colours.** The store says NO SINGLE OWNER while it holds anything; an empty home says
  "empty" and has a dashed border; a station says REACHED, OUT OF SYNC or TWO OWNERS; a hop backwards is a
  red dashed arrow under the stations with the words "copies back".
- **Metrics follow the outline** and are computed from the state. "State kinds" is the homes in use out of
  five (`0 of 5` to `5 of 5`); "Unowned items" is the items still in the global store (`8` to `0`); both are
  red until every item has a home. "Update path length" counts hops (`1 hop`, `4 hops`): red when a hop went
  back or a station holds a copy out of sync or a second owner, teal otherwise, and `—` before any update.
  Every value is at most seven characters.
- **Step 1 loops, step 5 does not.** Step 1: click, store, URL, back to the store, then the screen: four hops,
  one backwards. Step 5: click, handler, owner (the URL), screen: three hops, all forward. The metric is about
  direction more than length; the outline asked for length, so both are shown.
- **The last step starts from the sorted state**, so its metrics read `5 of 5`, `0`, `—` next to the verdict
  table instead of the base state's red `0 of 5` and `8`.
- **No library is named.** Tools are drawn as kinds (request cache, component, search params, storage,
  subscription). Code samples use React's `useState` and `useEffect`, and helpers written for this
  project (`useCachedRequest`, `useSearchParam`, `useStored`, `useLiveEvent`); each is four to six lines.
- **Numbers and names.** The page, its items and the hops are made up; the drawing says "illustrative page ·
  simulated hops" and step 1's text says the page, items and counts are illustrative.
- **Verdict tones.** The four plain homes are `ok`; "Event, then refetch" and "Derive it, no home" are
  `warn`, since each asks for a rule rather than a place. Verdicts were kept short ("Event, then refetch",
  not "Real-time event, then refetch") so none wraps.
- **Colours keep their meaning**: teal for the server home and for tools, orange for client UI and URL (user
  intent) and for the update's path, violet for the real-time home, grey for persistent, red for the second
  owner, drift and the hop back.
- **Layout.** The viewBox is 640 by 464, taller than lesson 5's 408, for three bands. Lanes: `fwd0` to `fwd2`
  above the stations and `back0` to `back2` below them (used with `dir: 'back'`).

**Tests**

- `src/components/scenes/StateOwnershipScene.test.tsx`: the counts, the metrics and their tones, values
  within seven characters for every step's start, the store and home words, chip places, guarantees and
  tools, station words and the hop back, the lanes, and the same picture for the same state.
- `e2e/lesson-06-state-ownership.spec.ts`: the whole lesson with the keyboard against a frozen clock (metrics,
  homes and station marks after the frames, the packets, the verdict table, back to step 1), the takeaways,
  Space and R, reduced motion, 375 px, and axe in both themes on every step and with a packet in flight. The
  shared checks pick the lesson up from the catalog.

**JavaScript per route, from the export** (gzipped, level 9):

| Route                           | Before (main)     | After (this branch) | Of which its own file |
| ------------------------------- | ----------------- | ------------------- | --------------------- |
| `/` (catalog)                   | 139.2 KB, 8 files | 139.2 KB, 8 files   | none, and no scene    |
| `/lessons/optimistic-ui/`       | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.7 KB                |
| `/lessons/push-pull-sync/`      | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.6 KB                |
| `/lessons/virtualization/`      | 147.1 KB, 8 files | 147.1 KB, 8 files   | 9.4 KB                |
| `/lessons/normalized-data/`     | 146.8 KB, 8 files | 146.8 KB, 8 files   | 9.2 KB                |
| `/lessons/rendering-isolation/` | 147.0 KB, 8 files | 147.0 KB, 8 files   | 9.3 KB                |
| `/lessons/state-ownership/`     | none              | 146.8 KB, 8 files   | 9.1 KB                |

No other page changed in size. The new page has 3.2 KB to spare.

**Lighthouse** (mobile profile, median of 5): the lesson page performance 100, accessibility 100, best practices
100, LCP 0.75 s, CLS 0.000, total blocking time 37 ms.

## D20. Lesson tooling, a preparation pull request (2026-11-27)

No dependency was added, `src/engine/` is unchanged (`git diff main -- src/engine` is empty), no lesson's text or
data changed, and no scene changed. Owner answers to the lesson 6 questions, recorded:

1. Lesson 6 stays as it is.
2. Diagrams scrolling inside their box on a phone is accepted until M6; `docs/PROGRESS.md` has the line under M6.
3. The speed-up is accepted: the shared tooling first (this pull request), then lessons 7 to 12 two at a time.

**What was built** (the owner's list)

1. **One shared end-to-end spec, fed by the lesson data.** `e2e/lesson-shared.spec.ts` loops over the ready lessons
   in the catalog and loads each lesson's data (`loadLesson(slug)` in `e2e/lesson-helpers.ts`). It checks the
   takeaways (expected from each step's `takeawayIndex`), Space and R, reduced motion, no sideways scroll at
   375 px, and axe in both themes on every step and with a packet in flight. A lesson's own spec now holds only
   its step-by-step play-through. Lessons 3 to 6 lost those blocks from their specs; lessons 1 and 2 keep theirs
   in `lessons.spec.ts` and gain the shared ones.
2. **A shared scene module**, `src/components/scenes/sceneKit.tsx`: the styles, the colour of each tone, `Bracket`,
   `PanelBox`, `StateChip`, `BoundaryLabel` and the character-width maths. See "Sharing costs bytes" below: it is
   built, tested and guarded, and no existing scene uses it.
3. **Shared scene test helpers**, `src/components/scenes/sceneTest.tsx`: `drawScene`, `canonical`, `fadedText`,
   `isFaded` and `expectSamePicture`. The tests of lessons 1 and 3 to 6 use them (133 lines fewer in those tests).
4. **`pnpm budget` prints the size table as a markdown table** (route, gzipped JavaScript, limit, files, its own
   file, scene). `--json` is unchanged.
5. **A pull request template** for lessons, `.github/PULL_REQUEST_TEMPLATE/lesson.md` (use it with
   `gh pr create --template lesson.md`). It is not the default template, so other pull requests are not affected.
6. **`pnpm check:lesson <slug>`** (`scripts/check-lesson.mjs`): lint, types, formatting, the unit tests, the build,
   the budget, the end-to-end tests that cover the lesson, the Storybook build and Lighthouse on the lesson page,
   in one run, with `caffeinate` keeping the Mac awake. It prints and saves a markdown block
   (`.lesson-checks/<slug>/report.md`, not in git) with each check's result, the size table and the Lighthouse
   numbers.
7. **Timings from frame times: done.** `playhead(page, lesson)` gives `run.toFrame(k)` and `run.next()`; the
   play-throughs of lessons 3 to 6 now name a frame instead of a time (67 hand-written waits changed; every one
   landed on a frame time, so none needed a judgement). The shared checks read their times from the frames too.
8. **Docs:** the "New lesson procedure", a new "Two lessons at a time" section, and CLAUDE.md.

**Sharing costs bytes: why lessons 3 to 6 do not use the shared module**

A lesson page loads one scene. So sharing code between scenes can never make a page smaller: the page still carries
everything its scene uses, now through a module boundary, and anything in the shared module that another scene
uses and this one does not. I moved the repeated blocks of lessons 3 to 6 into the module and built five layouts,
measuring each page's gzipped JavaScript against main (bytes; lessons 1 and 2 and the catalog never changed):

| Layout of the shared module                                  | Pages that grew | Growth per page (bytes) |
| ------------------------------------------------------------ | --------------- | ----------------------- |
| Everything in one module, used by all four scenes            | 4 of 4          | +544 to +775            |
| Styles in one module, components in three, `Bracket` shared  | 3 of 4          | +428, +497, +77         |
| Styles and tone maps only (six strings, two maps, the maths) | 4 of 4          | +25 to +55              |
| Three strings only (`cap`, `small`, `ease`)                  | 4 of 4          | +8 to +41               |

What happens: a function or component that two lesson routes share is put in a chunk of its own, with a copy of
`LessonRoute`, which splits each page into two gzip streams and costs about 0.45 KB per page (the two pages that
share `Bracket` grew by 428 and 497 bytes in the second row). Constants alone stay in the page's own chunk, but
their module wrapper and the exports the page does not use still cost 8 to 55 bytes. The owner's condition is that no page grows, so **lessons 3 to 6 keep their own
copies** and the module is for new scenes. Moving them over is possible whenever the owner accepts the numbers
above (see the open questions in the pull request). The SVG of every step is identical either way.

The module is still worth having for lessons 7 to 12: a new scene that repeats a block has the same cost whether
it copies it or imports it, apart from the 8 to 55 bytes, and the module is where the blocks are tested once. Each
new lesson's size is in `pnpm budget`.

**Guards**

- `src/components/scenes/boundaries.test.ts` and ESLint `no-restricted-imports` rules (`eslint.config.mjs`): only
  scenes import `sceneKit`; only tests import `sceneTest`; a scene imports no other scene and no lesson data; the
  kit imports no scene. The test runs the rule over the whole tree and over deliberately broken trees.
- `pnpm budget` still fails a lesson page that carries or names another lesson's scene (D16).

**Choices the spec did not settle**

- **The shared spec covers lessons 1 and 2 as well.** One loop over the catalog is simpler than a list, and it
  costs 16 more end-to-end tests in total (157 before, 173 after).
- **Reduced motion is checked against a full play.** For each step, the diagram (or verdict table) a reduced-motion
  visitor sees at once must equal the picture a full play ends in, with the clock frozen and run to the step's last
  frame plus a packet's flight. That replaces four hand-written reduced-motion tests, each of which named a few
  marks, with one that compares the whole picture. The markup is compared with attributes in a fixed order and the
  `style` text as the browser parses it (the server writes `translate(0px, 0)`, an update leaves
  `translate(0px, 0px)`).
- **Space and R** pause after step 1's first frame (or at 0 if it has one time), hold for a minute, resume, check
  that the step plays on and every packet lands, replay, check the first picture is back, and play again to the
  same end. Step 1 of a lesson must have frames; the test says so if it has none.
- **A new content rule: takeaways are ticked in order** (`takeawayIndex` never goes down from one step to the next),
  so the checklist fills from the top. The spec does not say it; all six lessons already follow it. The engine's own
  validation already fails an out-of-range index and a takeaway no step ticks.
- **A metric value is checked at every frame** in `content/lessons/lessons.test.ts` (at most seven characters), for
  every lesson, so a lesson's scene test need not repeat it. Lesson 6's own test of it was removed.
- **`pnpm check:lesson` carries on past a failure** so one run shows everything that is wrong; the steps that need
  the build are skipped if it fails. It runs the whole unit suite (it takes seconds) and, for end-to-end, the
  lesson's own spec, the shared spec filtered to the lesson, and the four specs that read every ready lesson
  (step card, layout shift, metric labels, shell); `pnpm test:e2e` runs everything.
- **The pull request template is not the default one**, because the repository has other kinds of pull request.

**Proof that the pictures did not change.** A throwaway test (not committed) rendered the SVG of lessons 1 to 6 for
the start state of every step and after every frame, 160 states, with each scene's metrics, on `main` and on this
branch: the two files are byte-identical. The built export agrees: the CSS file is identical, and every page's HTML
(the catalog and the six lesson pages, which hold the first paint of step 1) is identical apart from Next.js's build
id.

**Deliberate breakages** (each applied, run, and reverted):

| Breakage                                                          | Caught by                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `takeawayIndex: 9` in a lesson with four takeaways                | `lessons.test.ts`: "takeawayIndex 9 is out of range", and the order test               |
| A step ticking takeaway 5 before takeaway 2                       | `lessons.test.ts`: "no step ticks takeaway 1", and the order test                      |
| No step ticking the last takeaway                                 | `lessons.test.ts`: "no step ticks takeaway 4"                                          |
| A metric value of `4 hops taken` (12 characters)                  | `lessons.test.ts` (names the step and frame) and `e2e/metric-labels.spec.ts` ("wraps") |
| An empty `sceneAlt`                                               | `lessons.test.ts`: "sceneAlt is empty"; the shared axe check fails on that lesson      |
| A scene importing another lesson's scene                          | ESLint, `boundaries.test.ts`, and `pnpm budget` ("includes another lesson's scene")    |
| A scene that counts its draws (a picture that depends on history) | the scene's same-picture test; the shared Space and R check and reduced-motion check   |
| The checklist ticking the next item instead (app code, mutated)   | the shared takeaways check, "step 1 of 6"                                              |

The shared takeaways check compares the page with the lesson data, so it catches a page that ticks the wrong item,
not a wrong index in the data; the unit rules above catch those.

**JavaScript per route, from the export** (gzipped, level 9; bytes are the same on `main` and on this branch):

| Route                           | Before (main)     | After (this branch) | Of which its own file |
| ------------------------------- | ----------------- | ------------------- | --------------------- |
| `/` (catalog)                   | 139.2 KB, 8 files | 139.2 KB, 8 files   | none, and no scene    |
| `/lessons/optimistic-ui/`       | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.7 KB                |
| `/lessons/push-pull-sync/`      | 146.3 KB, 8 files | 146.3 KB, 8 files   | 8.6 KB                |
| `/lessons/virtualization/`      | 147.1 KB, 8 files | 147.1 KB, 8 files   | 9.4 KB                |
| `/lessons/normalized-data/`     | 146.8 KB, 8 files | 146.8 KB, 8 files   | 9.2 KB                |
| `/lessons/rendering-isolation/` | 147.0 KB, 8 files | 147.0 KB, 8 files   | 9.3 KB                |
| `/lessons/state-ownership/`     | 146.8 KB, 8 files | 146.8 KB, 8 files   | 9.1 KB                |

**Tests:** unit 527 before, 552 after (36 and 40 files); end-to-end 157 before, 173 after.
