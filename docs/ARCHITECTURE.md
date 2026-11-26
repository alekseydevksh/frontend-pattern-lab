# Architecture

> Filled in as the milestones land: the design system (M1), the lesson engine (M2) and the
> first two lessons (M3) are described below; the app shell (M4) comes next. The full design is in
> [SPEC.md](SPEC.md).

## Layout

Lesson content, the playback engine and the scene drawings live in three separate places,
so a new lesson never touches the engine.

| Folder                   | Holds                                                                 | Exists                                |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------- |
| `content/lessons/`       | Typed lesson data, one file per lesson, and the ordered registry      | M2 (registry), M3 (lessons)           |
| `content/dev/`           | The dummy lesson for the player test page. Not in the registry        | M2                                    |
| `src/engine/`            | Types, `useLessonPlayer`, timeline, packet helpers, validator         | M2                                    |
| `src/components/scenes/` | One pure SVG scene per lesson, and the registry                       | M2 (registry), M3 (scenes)            |
| `src/components/ui/`     | Button, Pill, Chip, Card, and so on                                   | M1                                    |
| `src/components/lesson/` | Player parts, the lesson shell and the cards, tables and lists in it  | M2 (player parts), M3                 |
| `src/app/`               | App Router pages and layout, the two `/dev/` pages, `/lessons/[slug]` | M0, gallery M1, player M2, lessons M3 |
| `src/lib/`               | Theme logic, fonts, `format`, small helpers                           | M1, M2                                |
| `src/styles/`            | Design tokens and global styles                                       | M1                                    |
| `.storybook/`            | Storybook configuration                                               | M1                                    |
| `messages/`              | Interface text (`en.json`)                                            | M0                                    |
| `e2e/`                   | Playwright tests                                                      | M0                                    |

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
the `onPastEnd` option, if there is one (the page decides what it means; M4 opens the next lesson). Space is left alone when focus is on
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
`content/lessons/lessons.test.ts` runs it over every lesson in the registry, so a mistake in lesson
data fails `pnpm test` and the build. It also fails if fewer than two lessons are registered. It checks the six rules of the spec (repeated step ids, a
`takeawayIndex` out of range, frames not sorted by `at`, a `sceneId` missing from the scene
registry, a packet on a lane the scene does not define, an empty `sceneAlt`) and a few more
(D11). `src/engine/validate.test.ts` tests each rule with a deliberately broken lesson.

## Player test page

`/dev/player/` plays `content/dev/dummy-lesson.ts` with `components/scenes/dev/DummyScene.tsx`
through `LessonShell`, the same shell the real lessons use. Neither file is in a registry, so they never reach the
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
| Progress in `localStorage`                                      | Not yet: M4                                            |
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

**The page.** `src/app/lessons/[slug]/page.tsx` (server) finds the lesson, renders `LessonHeader`
(breadcrumb, title, chips, summary) and passes it to `LessonShell` (client) as a prop. The shell runs
`useLessonPlayer` and lays out the two columns of the prototype: the stage card (header, metrics,
diagram, step counter with Replay and Pause, `Stepper`) and, beside it, the `StepCard` (with
`StepControls` under its live region) and the `Takeaways` card. On a step with a `summary`, a
`VerdictTable` takes the place of the diagram. `LessonsFrame` around it is temporary: M4 replaces it.

**Parity with the prototype** is a test: `content/lessons/prototype-parity.test.ts` loads the
prototype and compares text, step order, frame times, packets, the scene state after every frame,
metrics and verdict tables. `e2e/lessons.spec.ts` plays both lessons with the keyboard.
