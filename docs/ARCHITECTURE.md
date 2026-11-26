# Architecture

> Filled in as the milestones land: the design system (M1), the lesson engine (M2), the first two
> lessons (M3), the app shell (M4) and the loading and layout work before the new lessons (M5 prep)
> are described below. The full design is in [SPEC.md](SPEC.md).

## Layout

Lesson content, the playback engine and the scene drawings live in three separate places,
so a new lesson never touches the engine.

| Folder                    | Holds                                                                 | Exists                                   |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `content/lessons/`        | Typed lesson data and the catalog of all 12                           | M2 (registry), M3 (lessons), M4, M5 prep |
| `content/dev/`            | The dummy lesson for the player test page. Not in the registry        | M2                                       |
| `src/engine/`             | Types, `useLessonPlayer`, timeline, packet helpers, validator         | M2                                       |
| `src/components/scenes/`  | One pure SVG scene per lesson, and the registry the tests read        | M2 (registry), M3 (scenes), M5 prep      |
| `src/components/ui/`      | Button, Pill, Chip, Card, and so on                                   | M1                                       |
| `src/components/lesson/`  | Player parts, the lesson shell and the cards, tables and lists in it  | M2 (player parts), M3                    |
| `src/components/shell/`   | Site header, footer and the shell that wraps pages and the 404        | M4                                       |
| `src/components/catalog/` | The lesson card and the saved-progress note                           | M4                                       |
| `src/app/`                | Pages and layouts: `(site)` (catalog, lessons), 404, sitemap, `/dev/` | M0, gallery M1, player M2, shell M4      |
| `src/lib/`                | Theme, saved progress, `?step=` parsing, metadata, fonts, `format`    | M1, M2, M4                               |
| `scripts/`                | The static server, Lighthouse runner and the JavaScript budget check  | M0, M4, M5 prep                          |
| `src/styles/`             | Design tokens and global styles                                       | M1                                       |
| `.storybook/`             | Storybook configuration                                               | M1                                       |
| `messages/`               | Interface text (`en.json`)                                            | M0                                       |
| `e2e/`                    | Playwright tests                                                      | M0                                       |

## Design system (M1)

**Tokens.** `src/styles/tokens.css` is the only place that holds colour, type and radius
values. Colours are CSS variables per theme. The `:root` rule holds the light values and the
`[data-theme='dark']` rule redefines the same names for dark. With no `data-theme`, dark
follows `prefers-color-scheme`. Tailwind reads the variables through `@theme inline`, so a
utility such as `bg-panel` follows the theme without a second stylesheet. The same rules match
any element with `data-theme`, which is how Storybook shows both themes side by side. A unit
test checks every token against the spec, and another fails if a component hard-codes a colour.

The signal colours (`--req`, `--res`, `--ev`, `--bad`) are for borders, fills, lines and packets.
Used as small text, they fail AA contrast in the light theme, so each has a derived `-text` token
(a 30% mix of `--ink`) with 5:1 or better on every surface. `--muted-text` does the same for
text on a muted tint. The rule, and a test that holds it, are in D10 in
[DECISIONS.md](DECISIONS.md).

**Theme.** `src/lib/theme.ts` holds the logic (choose, store, apply, subscribe) and the inline
script that `layout.tsx` puts in `<head>`. The script copies a stored choice onto `<html>`
before first paint. The attribute (`data-theme`) and storage key (`pl-theme`) are the ones the
prototype uses. All storage access is wrapped, so blocked storage means "no stored choice".
`ThemeToggle` is a native button with `aria-pressed`; it reads the theme through
`useSyncExternalStore`, so it also follows changes made from outside, such as Storybook's
toolbar.

**Components.** Everything in `src/components/ui/` is a small, native-element component styled
with token utilities: `Button` (primary, secondary; sizes md and sm), `Pill` (tones), `Chip`,
`Card`, `MetricTile`, `Kbd` and `ThemeToggle`. Only `ThemeToggle` is a client component. The
lesson-level components take lesson types, so they live in `components/lesson/`: the player
parts (`StepControls`, `PlayerControls`, `Diagram`, `PacketLayer`) are built in M2 because the
player test page needs them; `MetricsRow`, `Takeaways`, `CodeBlock` and the rest are built in M3,
when the first lesson needs them, and `LessonShell` in M4.

**Focus and motion.** `globals.css` draws one 2 px `--ev` outline on every `:focus-visible` and
turns off all transitions and animations under `prefers-reduced-motion`.

**Storybook.** Run `pnpm storybook`. Each component has a story file next to it with one story
per variant and a `BothThemes` story that shows the light and dark theme side by side. The
toolbar has a theme switch that sets `data-theme` on `<html>`, as the site does. The
`Foundations/Tokens` page lists the colours (read live from the CSS) and the type styles.
`pnpm build-storybook` writes a static build to `storybook-static/`, which is not committed.

**Component gallery.** `/dev/components/` shows every component, with a theme toggle. It is the
page that Playwright and axe check in both themes (`e2e/components.spec.ts`). It is
`noindex` and not linked from anywhere, but it is part of the static export.

## Lesson engine (M2)

Three places that never import each other's internals: lesson **content** (typed data), the
**engine** (state over time) and the **scene** (SVG). A lesson file imports only the engine's
types and the state type of its own scene.

```text
content/lessons/<slug>.ts   Lesson<S>           steps, frames, packets: plain data
        │
        ▼
useLessonPlayer(lesson, scene, options)         src/engine/useLessonPlayer.ts
        │   stepIndex, state, activePackets, isPaused, metrics,
        │   goTo, next, back, replay, togglePause
        ▼
<Diagram>  <svg role="img" aria-label={step.sceneAlt}>
        ├── scene.Component state={state}       pure: state in, SVG out
        └── <PacketLayer>                       moves the packets in flight (Web Animations)
```

**Files in `src/engine/`**

| File                            | Job                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `types.ts`                      | `Lesson`, `Step`, `Frame`, `Packet`, `SummaryTable`, `SceneDefinition`, `Lane`, ... |
| `clock.ts`                      | The `Clock` interface (`now`, `setTimeout`, `clearTimeout`) and the real one        |
| `timeline.ts`                   | Runs a list of timed events, once each, with pause and resume. No React             |
| `state.ts`                      | Pure helpers: shallow patch, start state, final state                               |
| `packets.ts`                    | Packet keyframes, `animatePacket` (Web Animations), pause that never restarts       |
| `keyboard.ts`                   | Pure mapping from a key press to a command (next, back, replay, togglePause)        |
| `reducedMotion.ts`              | `usePrefersReducedMotion` over `matchMedia`, with a full-motion server snapshot     |
| `useLessonPlayer.ts`            | The hook: a `useReducer` for the state, effects for the timeline and the keys       |
| `validate.ts`                   | `validateLesson` / `validateLessons`: the content rules, as readable messages       |
| `testClock.ts`, `testLesson.ts` | Test helpers only: a manual clock, and a small lesson with its scene                |

**How a step plays**

1. Entering a step (first render, `goTo`, `next`, `back`, `replay`) computes its state in the
   reducer: `baseState` with `startState` merged over it. That state is in the same render as
   the step, so the first paint, and the server HTML, show the start state in full.
2. An effect keyed on the run builds a timeline from the frames (a `set` and a packet at each
   `at`) and, for each packet, one more event when the packet is gone (`at` plus
   `PACKET_DURATION_MS`). It starts the timeline on the clock it was given.
3. Each event dispatches into the reducer: a `frame` patches the state (shallow: arrays and
   objects are replaced whole) and adds its packet to `activePackets`; an `expire` removes it.
   Both carry the run they belong to, and a late one from a step already left is ignored.
4. `PacketLayer` mounts one `<g>` per active packet and animates it along its lane with the
   Web Animations API. Removing the packet cancels the animation.

**Pause and resume.** The timeline keeps its events in a list sorted by time, with one pointer
to the next one to run, and arms one timer for that event only. Pause stores the elapsed time
and clears the timer. Resume moves the start time back so the same time has elapsed, and arms
the next timer. An event is spent when the pointer passes it, so it runs once whatever the
timers do. The packets' animations are paused and resumed with it, never restarted.

**Reduced motion.** When the visitor prefers reduced motion, entering a step applies every
frame at once (the final state), no timeline is created and no packet is ever added. Pause
does nothing and its button is disabled; Replay and the step controls still work. The
preference is read through `useSyncExternalStore`: the server renders the full-motion case, and
a visitor with the preference gets the final state as soon as the page hydrates, and again if
the setting changes while the page is open.

**Keys.** The hook listens on `document` (turn off with `keyboard: false`). Right and left
arrows change step, `R` replays, Space pauses and resumes. The right arrow on the last step calls
the `onPastEnd` option, if there is one (the page decides what it means; the lesson page opens the next lesson). Space is left alone when focus is on
a button, link or similar control (where it means "activate"), and nothing fires while typing
in a field, with Ctrl, Meta or Alt held, for a held key's repeats, or for a key that another
handler already took.

**The clock.** `options.clock` is the only source of time. In unit tests it is a manual clock
(`testClock.ts`) that moves when the test says so; the default is the browser's timers, which
also follow fake timers. In Playwright the page clock is frozen with `page.clock.pauseAt`.

## Scene contract

A scene is a `SceneDefinition<S>`: a `viewBox`, the `lanes` its packets can use, a pure
`Component` that draws a state, and a `metrics` function that turns a state into three values.

- Same state in, same SVG out. No timers, no globals, no `useState`.
- Every word on screen comes from the state, which comes from the lesson data. Fixed interface
  text would come from `messages/en.json`; scenes should need none.
- Text and shapes use token classes (`fill-ink`, `stroke-line`, `fill-res-text`), never a literal
  colour. Small text uses the `-text` tokens, as everywhere (D10).
- The scene does not draw packets, the `<svg>` element or its `aria-label`: `Diagram` does.

## Content validation

`validateLessons(lessons, scenes)` returns one message per problem. The test in
`content/lessons/lessons.test.ts` runs it over every lesson page's lesson, with the scene that page draws, so a mistake in lesson
data fails `pnpm test` and the build. It also fails if fewer than two lessons are registered. It checks the six rules of the spec (repeated step ids, a
`takeawayIndex` out of range, frames not sorted by `at`, a `sceneId` missing from the scene
registry, a packet on a lane the scene does not define, an empty `sceneAlt`) and a few more
(D11). `src/engine/validate.test.ts` tests each rule with a deliberately broken lesson.

## Player test page

`/dev/player/` plays `content/dev/dummy-lesson.ts` with `components/scenes/dev/DummyScene.tsx`
through `LessonShell`, the same shell the real lessons use. Neither has a lesson page, so they never reach the
catalog. `e2e/player.spec.ts` drives the page with the keyboard against a frozen clock, checks
reduced motion, and runs axe in both themes. Like the component gallery, the page is `noindex`
and part of the static export (D11).

## Playback rules

The rules are in "Playback rules" in [SPEC.md](SPEC.md); this is where each one is implemented
and tested.

| Rule                                                            | Where                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| Entering a step sets `baseState` + `startState`, then schedules | `enterStep` and the schedule effect in the hook        |
| First paint shows the start state in full                       | State computed in the reducer; a `renderToString` test |
| Pause stores elapsed time; resume runs only the frames left     | `timeline.ts`; pause, resume and hook tests            |
| Reduced motion applies all frames at once, skips packets        | `enterStep` with `reduced`; hook and e2e tests         |
| The clock is injectable                                         | `clock.ts`, `testClock.ts`                             |
| Packets use Web Animations and clean up on a step change        | `packets.ts`, `PacketLayer`; unit tests                |
| Keys                                                            | `keyboard.ts` and the hook; unit and e2e tests         |
| Visited steps tick takeaways                                    | `LessonShell` (furthest step reached); unit and e2e    |
| Progress in `localStorage`                                      | `lib/progress.ts`, saved by `LessonShell`; unit, e2e   |
| A step with a summary shows a verdict table                     | `LessonShell`, `VerdictTable`; unit and e2e tests      |

## Lessons (M3)

Lessons 1 and 2 are ported from `reference/prototype.html`.

| Lesson | Data                                | Scene                                     | Route                      |
| ------ | ----------------------------------- | ----------------------------------------- | -------------------------- |
| 1      | `content/lessons/optimistic-ui.ts`  | `components/scenes/OptimisticUiScene.tsx` | `/lessons/optimistic-ui/`  |
| 2      | `content/lessons/push-pull-sync.ts` | `components/scenes/PushPullScene.tsx`     | `/lessons/push-pull-sync/` |

**Scene state.** A scene exports its state type next to the drawing; the lesson file imports that
type and nothing else from the scene. The state holds everything the scene says: its labels
(`labels`, with `{name}` templates filled by `format`), the names in the diagram, and the fields the
frames patch. The scene's `metrics` are fields of the state (lesson 1) or computed from it (lesson 2).

**The page.** Each lesson has a page file, `src/app/(site)/lessons/<slug>/page.tsx` (server), that imports
the lesson's data and its scene and passes them to `lessonPage` (`lessons/lessonPage.tsx`, see "Loading",
below). That renders `LessonHeader` (breadcrumb, title, chips, summary) and passes it, the lesson and the
scene to `LessonRoute` (client), which renders `LessonShell` with them. The shell runs `useLessonPlayer` and lays out the two columns of
the prototype: the stage card (header, metrics with the "Simulated" pill, diagram, step counter with Replay
and Pause, `Stepper`) and, beside it, the `StepCard` (with `StepControls` under its live region) and the
`Takeaways` card. On a step with a `summary`, a `VerdictTable` takes the place of the diagram.

**Parity with the prototype** is a test: `content/lessons/prototype-parity.test.ts` loads the
prototype and compares text, step order, frame times, packets, the scene state after every frame,
metrics and verdict tables. `e2e/lessons.spec.ts` plays both lessons with the keyboard.

## App shell (M4)

```text
src/app/layout.tsx              <html>, fonts, theme script, metadataBase (the production URL)
src/app/(site)/layout.tsx       SiteShell: skip link, header, content, footer
src/app/(site)/page.tsx         the catalog, from content/lessons/catalog.ts
src/app/(site)/lessons/<slug>/  one page per lesson; lessonPage.tsx and LessonRoute.tsx beside them
src/app/not-found.tsx           the 404 page, wrapped in SiteShell itself
src/app/dev/                    test pages with their own bare frames, outside the shell
src/app/sitemap.ts, robots.ts   written once at build time
```

**Routes and the route group.** `(site)` is a route group: it adds a layout without adding a URL
segment, so the catalog and the lessons share the header and footer while `/dev/` does not. The 404
page sits outside every layout (Next.js renders it under the root layout only), so it wraps itself
in `SiteShell`. Each page renders its own `<main id="main">`, which the skip link targets.

**Static generation.** `pnpm build` prints every route as static: `/`, `/_not-found`, the two `/dev/`
pages, one `/lessons/<slug>` per ready lesson (one folder each, D16), `/robots.txt` and `/sitemap.xml`. Nothing reads the query string on the
server, so one page per lesson serves every `?step=`.

**The catalog.** `content/lessons/catalog.ts` has one entry per lesson of the spec table, in
order (the position is the lesson number). `status: 'ready'` means a `Lesson` with the same slug has a
page in `src/app/(site)/lessons/<slug>/` and the entry also holds its `minutes` and `stepCount`; `status:
'soon'` means there is none, and the card says so and has no link. `catalog.test.ts` holds the entries, the
lesson pages, the lessons and the spec table together. The page is a server component that shows one list in
lesson order, numbered 1 to 12, with the track as a label on each card (D14); its only client part is
`ProgressNote` on each ready card. It reads the entries only: no lesson data and no scene.

**Saved progress** (`lib/progress.ts`, `lib/useProgress.ts`). One `localStorage` key, `pl-progress`,
holds `{ v: 1, lessons: { [slug]: { step, ticked, completed } } }`: the furthest step reached
(from 0), the takeaways ticked, and whether the last step has been reached. The functions are
plain and take the storage as a parameter. Every access is in try/catch and everything read back is
validated, so blocked, full or corrupt storage means "nothing saved", never an error. Progress only
moves forward. `useProgress()` is a `useSyncExternalStore` whose server snapshot is "nothing", so the
server HTML and the first client render are the same, and the saved value arrives after hydration. It
follows the `storage` event (other tabs) and a custom event (this tab). `ProgressNote` holds its
height while empty, so the card does not grow when progress arrives.

**Deep links** (`lib/stepParam.ts`, `components/lesson/useStepInUrl.ts`). `?step=N` counts from 1. After
hydration the shell reads it and calls `goTo`; a whole number outside the lesson is clamped, anything
else (`abc`, `2.5`, empty) is ignored. As the learner moves, the address is rewritten with
`history.replaceState`, so stepping adds no history entries. Step 1 has no parameter. The server
HTML is always step 1, and a deep link jumps a moment after first paint.

**Next lesson.** `nextLessonAfter(slug)` (in `catalog.ts`) gives the next _playable_ entry. `LessonRoute` turns it
into the shell's `nextLesson` prop with the router, so the shell never imports Next.js (it is also
used in Storybook and in unit tests). On the last step the button reads "Next lesson: <title> →"
and the right arrow does the same, through `onPastEnd`. With no next lesson the button is "Restart
lesson" and the arrow does nothing.

**Metadata.** `lib/metadata.ts` builds a page's title, description, canonical path and the complete
Open Graph set (Next.js replaces a parent's `openGraph` whole, so each page carries all of it).
`metadataBase` in the root layout makes them absolute on `https://frontend-pattern-lab.vercel.app`.
Canonical paths end in a slash, as the export serves them, and never carry a query string.

**Performance checks.** `pnpm lighthouse` runs Lighthouse CI (`lighthouserc.cjs`) against `out/` on
the mobile profile, five runs per page, asserting the median of each metric, then runs the JavaScript
budget. `e2e/layout-shift.spec.ts` plays every step of both lessons and requires a layout-shift total
of 0. CI runs `pnpm lighthouse` after the end-to-end tests, and the budget on its own, right after the
build (see "The JavaScript budget" below).

## Loading and layout (M5 prep)

Decided in D14. Three things changed before lesson 3, so that adding lessons does not make every page
heavier or move.

**Loading.** A page loads what it shows and nothing else. Decided in D14, and changed in D16 so that the
lessons no longer share one route.

```text
catalog page (server)          catalog.ts entries only (title, summary, track, minutes, stepCount)
lessons/<slug>/page.tsx        imports one lesson's data and one scene  -> lessonPage(lesson, scene)
LessonRoute (client)           LessonShell with that lesson and scene
```

- Each lesson has a route folder of its own. Next.js bundles each route's client code on its own, so a lesson
  page's JavaScript holds its own scene and nothing that names another. There is no map of scenes in the
  browser and no `next/dynamic`. The scene is drawn in the server HTML, so the first paint is complete.
- A scene file starts with `'use client'`. On the server the scene is a client reference, which the page
  hands to `LessonRoute` as a prop. `lessonPage<S>` takes a `Lesson<S>` and a `SceneDefinition<S>`, so the
  pair must agree on the state type. It throws, and fails the build, for a lesson whose catalog entry is
  not ready.
- `src/components/scenes/registry.ts` is for tests and tools only. It reads every page file with Vite's
  `import.meta.glob` and gives `lessonPages`, `lessons` and `sceneRegistry` (scenes by `sceneId`), so
  nothing is registered by hand. The app never imports it.
- `LessonShell` takes the scene as a prop and does not import the registry.
- Two ways that keep a single `/lessons/[slug]` route were tried and do not split, because Turbopack puts
  every client module reachable from one route into that route's shared chunks: passing the scene from the
  server page as a client reference (D14), and `next/dynamic` called on the server over one client view per
  scene (D16). `next/dynamic` in client code does split, but its map of loaders reaches every lesson page.

**The step card does not change height.** The card must be as tall as the tallest step at every width,
because the text of a step changes length and wraps differently on a phone. `StepCard` draws every step's
text in the same grid cell, and shows only the current one: the others are invisible (`invisible`), out of
reach of assistive technology (`aria-hidden`) and of the keyboard and pointer (`inert`), and outside the live
region, so a screen reader hears each step once, as before. The cell is as tall as the tallest copy, in pure
CSS, with the right height already in the server HTML. The Next button does the same with its label (a long
label wraps to two lines on a phone), and the stage card reserves the verdict table's height under every
diagram, because a table with many rows can be taller than the diagram it replaces.
`e2e/step-card.spec.ts` measures the card, its buttons, the takeaways, the footer and the page height at
every step of both lessons, on a desktop and a phone. Tests that look for step text with `getByText` must
look inside the live region, because the copies hold the same words.

**The JavaScript budget.** `scripts/js-budget.mjs` (`pnpm budget`) reads the export in `out/`: the
catalog is `index.html` and every `lessons/<slug>/index.html` is a lesson page, so a new lesson is measured
without editing the script. It gzips the scripts each page loads (blocking, async and preloaded; not
Next.js's `nomodule` polyfill, which no current browser fetches). It fails a lesson page over 150 KB, and a
lesson page that has no JavaScript file of its own while there are two or more (the scenes would be bundled
together again). It also checks the scenes (D16): it reads which scene each lesson page renders from the
build's client reference manifests in `.next`, then looks for every scene's module in the JavaScript each
page loads. It fails a lesson page that carries another lesson's scene, or names a file that holds one (as a
map of loaders does), or does not carry its own, and a catalog that carries or names any scene.
`scripts/js-budget.test.ts` runs it against fake exports in `pnpm test`.
