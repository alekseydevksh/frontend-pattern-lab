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
