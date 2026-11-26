# Frontend Pattern Lab — Project Spec

Nov 25, 2026 · @Alex

> **This file is the living copy of the spec.** From M3 on, the owner's decisions are written
> here, and the spec outside the repository is no longer updated. Changes since the first
> version are recorded in [DECISIONS.md](DECISIONS.md) (D12 and later).

## Overview and goals

Frontend Pattern Lab is a static website of short animated lessons on frontend architecture patterns for large React applications. Each lesson teaches one idea that the reader steps through as a diagram. The project is a portfolio piece for a Senior Frontend, Design Systems and AI Developer Tooling profile, and Claude Code should build it from this document.

The ideas come from the sixteen patterns in [Frontend System Design Patterns for Large-Scale React Applications](https://medium.com/@dmitriilobanov3/frontend-system-design-patterns-for-large-scale-react-applications-699ef9bb3b1d) by Dmitrii Lobanov (23 Jun 2026). Lessons restate them in original words, with original diagrams and original code samples. The step-by-step diagram format is inspired by [designed-to-scale.vercel.app](https://designed-to-scale.vercel.app) but shares none of its assets, copy or illustrations.

**Goals**

- A visitor opens one link and finishes a lesson in about five minutes.
- The repository shows real engineering: a typed content model, a small reusable lesson engine, tests, CI and accessible components.
- Adding a lesson takes one data file and one scene component, with no change to the engine.
- The build process is visible in the repo: `CLAUDE.md`, short decision records and small pull requests.

**Success criteria**

- Lighthouse scores of at least 95 for performance, accessibility and best practices on a lesson page.
- Largest Contentful Paint under 2.5 s on a throttled mobile profile, and no layout shift while a lesson plays.
- Every v1 lesson can be completed with the keyboard alone, and respects reduced motion.
- CI is green on lint, type check, unit tests and end-to-end tests.

**Non-goals for v1**

- No backend, database, authentication, CMS or user accounts.
- No comments, analytics beyond the hosting default, or newsletter.
- English only at launch. The code is translation-ready, so other languages can be added later without changing components.

**Reference prototype.** A single-file HTML prototype with two lessons, [Frontend Pattern Lab](https://claude.ai/artifact/JWcx8dva21TKQPCoZLik3g), defines the target look and behaviour. Its HTML file is added to the repo as `reference/prototype.html` and is not shipped.

## Scope and roadmap

Version 1 ships all twelve lessons. Each lesson is its own pull request, so the main branch stays deployable and the repository history shows the project growing. The catalog lists the lessons by track.

| # | Lesson | Article sections | Track | Origin |
| --- | --- | --- | --- | --- |
| 1 | Optimistic UI | 7 | Data and state | Ported from prototype |
| 2 | Push + Pull Sync | 6 | Data and state | Ported from prototype |
| 3 | Virtualization | 10, 11 | Rendering and performance | New |
| 4 | Normalized Data | 9 | Data and state | New |
| 5 | Rendering Isolation | 13 | Rendering and performance | New |
| 6 | State Ownership | 4, 5 | Data and state | New |
| 7 | Requirements First and Component Boundaries | 1, 2 | Structure | New |
| 8 | Container, View, ViewModel | 3 | Structure | New |
| 9 | Backend for Frontend | 8 | Data and state | New |
| 10 | Progressive Rendering | 12 | Rendering and performance | New |
| 11 | Permission-Aware UI | 14 | Product reliability | New |
| 12 | Errors and Observability | 15, 16 | Product reliability | New |

Section numbers refer to the numbered headings in the source article. Lessons 1 and 2 are ported first from the prototype. Build the new lessons in table order: lessons 3 to 6 are the most visual and set the style of the new scenes. Lessons 7 and 11 are the least visual and may use simpler scenes, such as layered boxes and role switches.

## Tech stack and rationale

The site is Next.js with React and strict TypeScript, exported as static pages and hosted on Vercel. There is no server runtime and no database, because lessons are typed data in the repository. Install the latest stable version of each tool at project start, let the lockfile pin it, and record the versions in `docs/DECISIONS.md`.

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), React, strict TypeScript | Matches the target role. File-based routes give one URL per lesson. |
| Rendering | Static export, no server runtime | Fast, cheap, nothing to operate. |
| Hosting | Vercel | A preview URL per pull request and a permanent link for the CV. |
| Styling | Tailwind CSS on top of CSS variables for design tokens | Tokens drive light and dark themes. Tailwind utilities read from them. |
| Accessible primitives | Radix Primitives, only where needed: Tabs, Tooltip, Dialog, Switch | Keyboard, focus and ARIA come solved. Look and feel stay custom. |
| Animation | Web Animations API and CSS transitions | Already proven in the prototype. No animation library until a scene needs one. |
| State | React hooks, with `useReducer` inside the lesson player | State is local to a lesson. A global store would add nothing. |
| Content | Typed TypeScript modules in `content/` | Mistakes in lesson data fail the build. No CMS needed. |
| Fonts | `next/font` with Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono | Self-hosted by the framework, no layout shift. |
| Unit tests | Vitest and Testing Library | Fast tests for the engine and components. |
| End-to-end tests | Playwright with axe-core checks | Plays whole lessons and checks accessibility. |
| Code quality | ESLint, Prettier, TypeScript strict mode | One style, enforced in CI. |
| Package manager | pnpm | Fast installs, strict dependency tree. |
| CI | GitHub Actions: lint, type check, unit tests, build, end-to-end tests | Every pull request is checked the same way. |
| Component docs | Storybook, added in M1 | Shows the small design system, which supports the Design Systems story. |

**Deliberately not used**

- shadcn/ui: it brings its own look, and this project has few components and its own tokens.
- Redux or Zustand: nothing is shared across lessons.
- React Query or SWR: there is no network data.
- A database or CMS: lessons are code-reviewed data.
- Framer Motion: add it only when a scene needs orchestration that the Web Animations API cannot do.
- Large UI kits such as MUI: they conflict with the custom design.

**Dependency rule.** Every new dependency gets one sentence in `docs/DECISIONS.md` saying what it is for and why the platform or an existing tool is not enough.

## Architecture and repo layout

Lesson content, the playback engine and the scene drawings live in three separate places, so a new lesson never touches the engine. Content is typed data, the engine turns it into state over time, and a scene component draws that state as SVG. The page shell around them is plain React.

```text
frontend-pattern-lab/
  CLAUDE.md
  README.md
  docs/
    ARCHITECTURE.md
    DECISIONS.md
    ADDING_A_LESSON.md
  reference/
    prototype.html            # visual reference, not shipped
  content/
    lessons/
      optimistic-ui.ts
      push-pull.ts
      index.ts                # ordered registry of playable lessons
      catalog.ts              # M4: catalog entries for all twelve, ready or soon
  src/
    app/
      layout.tsx
      page.tsx                # catalog
      lessons/[slug]/page.tsx
    components/
      ui/                     # Button, Pill, Chip, Card, MetricTile, ThemeToggle
      lesson/                 # LessonShell, StepCard, Stepper, Takeaways, MetricsRow
      scenes/
        OptimisticUiScene.tsx
        PushPullScene.tsx
        registry.ts               # sceneId to component
    engine/
      types.ts
      useLessonPlayer.ts
      packets.ts                # Web Animations helpers
    styles/
      tokens.css
      globals.css
  e2e/
    lessons.spec.ts
```

**Routes**

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Catalog of all lessons by track | Server component. Built from catalog entries; lessons that are not ready show as coming soon. |
| `/lessons/[slug]` | One lesson | Pages are generated from the registry with `generateStaticParams`. |
| `/lessons/[slug]?step=3` | A lesson opened at step 3 | Lets a single step be linked and shared. |

**Rendering split.** The catalog and the lesson shell render on the server. Only the player and the scene are client components, so the catalog ships almost no JavaScript.

**Theme.** Tokens are CSS variables. The `data-theme` attribute on `<html>` overrides `prefers-color-scheme`. A tiny inline script sets it before first paint to avoid a flash. The choice is remembered in `localStorage`, guarded with try and catch.

**Translation-ready code.** English is the only language at launch, but no visible text may be hard-coded in a component or a scene. Lesson text lives in `content/`, interface text in `messages/en.json`, and scenes take their labels from the lesson state or from props. Adding a language later then means adding files and a `[locale]` route segment, with no component changes.

**Adding a lesson**

1. Create `content/lessons/<slug>.ts` exporting a `Lesson` object.
2. Create `components/scenes/<Name>Scene.tsx` that follows the scene contract, and register it in `scenes/registry.ts`.
3. Add the lesson to `content/lessons/index.ts` at its position.
4. Run the lesson-data validation test and the end-to-end smoke test.
5. Open one pull request titled `Add lesson: <title>`.

## Data model and lesson engine

A lesson is a typed object made of steps. Each step lists timed frames that patch the scene state and can fire a packet along a lane. The engine plays the frames, and the scene component draws whatever state it is given. The prototype already works this way in plain JavaScript, so this section is a port, not a redesign.

```ts
export type Tone = 'req' | 'res' | 'ev' | 'bad';

export interface Lesson<S> {
  slug: string;
  order: number;
  track: 'Data and state' | 'Rendering and performance' | 'Structure' | 'Product reliability';
  title: string;
  summary: string;
  minutes: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  sourceSections: number[];            // numbers of the article sections
  takeaways: string[];                 // shown as a checklist, ticked as steps are reached
  metricLabels: [string, string, string];
  sceneId: string;                     // key in scenes/registry.ts
  baseState: S;
  steps: Step<S>[];
}

/**
 * A catalog row (added in M4). `Lesson` is only for lessons that can be played. A lesson that
 * is not ready has a catalog entry and no `Lesson`, so the catalog never needs fake steps.
 */
export interface CatalogEntry {
  slug: string;
  title: string;
  summary: string;
  track: Track;
  status: 'ready' | 'soon';            // 'ready' means a playable Lesson with this slug exists
}

export interface Step<S> {
  id: string;
  tag: string;                         // PROBLEM, TECHNIQUE, FAILURE, SUMMARY, ...
  tone: Tone | 'neutral';
  title: string;
  shortTitle: string;                  // used by the "Next: ..." button: it names the step that comes next
  body: string[];                      // paragraphs, inline code in backticks
  keyIdea: string;
  code?: { language: 'ts' | 'tsx' | 'json'; source: string };
  takeawayIndex: number;
  sceneAlt: string;                    // text alternative of the diagram at this step
  startState?: Partial<S>;             // merged over baseState when the step starts
  frames: Frame<S>[];
  summary?: SummaryTable;              // the lesson shell shows it in place of the diagram
}

export interface Frame<S> {
  at: number;                          // ms from the start of the step
  set?: Partial<S>;                    // shallow patch, arrays replaced whole
  packet?: Packet;
}

export interface Packet {
  lane: string;
  dir?: 'fwd' | 'back';
  label: string;
  tone: Tone;
  lost?: boolean;                      // stops halfway and fades
}

export interface SummaryTable {
  title: string;
  rows: { label: string; verdict: string; tone: 'ok' | 'warn' }[];
}

export interface SceneDefinition<S> {
  viewBox: string;
  lanes: Record<string, { x1: number; x2: number; y: number }>;
  Component: React.ComponentType<{ state: S }>;
  metrics: (state: S) => [Metric, Metric, Metric];
}
export interface Metric { value: string; tone?: 'good' | 'bad' }
```

**Player hook**

`useLessonPlayer(lesson, scene, options)` returns `stepIndex`, `state`, `activePackets`, `isPaused`, `goTo(i)`, `next()`, `back()`, `replay()` and `togglePause()`. The options include `onPastEnd`, a callback for the right arrow on the last step; the page decides what it does (M4 opens the next lesson).

**Playback rules**

- Entering a step sets the state to `baseState` merged with `startState`, then schedules the frames by `at`.
- The first paint of a step shows its start state in full. Nothing waits for an animation to become visible.
- Pause stores elapsed time. Resume schedules only the frames that have not run, and resumes any packet animation in flight.
- With reduced motion, all frames apply at once and packet animation is skipped.
- The clock is injectable, so tests use fake timers instead of waiting.
- Packets animate with the Web Animations API and clean themselves up when a step changes.
- Keys: left and right arrows change step, `R` replays, Space pauses unless focus is on a button or link. The right arrow on the last step calls the `onPastEnd` option, if there is one.
- A step with a `summary` shows its verdict table in the lesson shell, in place of the diagram.
- Visited steps tick the matching takeaway. Progress is kept per lesson in `localStorage`, guarded with try and catch.

**Scene contract.** A scene is pure: the same state always draws the same SVG. It sets no timers and reads no globals. Text inside the SVG uses the token classes, never hard-coded colours.

**Content validation test.** A Vitest test imports every lesson and fails the build if step ids repeat, `takeawayIndex` is out of range, frames are not sorted by `at`, a `sceneId` is missing from the registry, a packet names a lane the scene does not define, or `sceneAlt` is empty. It also fails if fewer than two lessons are registered, so an emptied registry cannot pass by having nothing to check.

## Design system and accessibility

The look is a drafting-table workbench: cool paper with a faint grid, deep ink text, and three signal colours that always mean the same thing. Orange marks requests and user intent, teal marks server answers and truth, violet marks pushed events, and crimson marks failure. Colours are tokens, so the dark theme is a redefinition of the same names, not a second stylesheet.

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--paper` | #edf0f5 | #0c1426 | Page background |
| `--panel` | #fafbfd | #121d36 | Cards and panels |
| `--ink` | #16213a | #e7ecf8 | Primary text |
| `--muted` | #59667f | #97a5c3 | Secondary text |
| `--line` | #c8d0de | #2a3a5c | Borders and rules |
| `--grid` | #dde3ed | #15213d | Background grid |
| `--req` | #e0562b | #ff7d52 | Requests, user intent |
| `--res` | #0d8587 | #38c3c5 | Server answers, confirmed state |
| `--ev` | #6c4fe0 | #a592ff | Pushed events |
| `--bad` | #c42248 | #ff6384 | Failure, rollback |
| `--on-signal` | #ffffff | #0c1426 | Text on a filled signal colour (M3). `--req-solid` and `--res-solid` are the fills for it where the raw colour is too pale; see D12 |

**Type.** Bricolage Grotesque for headings, IBM Plex Sans for body text, IBM Plex Mono for labels, metrics and code. Keep text lines near 65 characters. Use tabular numbers wherever digits line up.

**Components to build in `components/ui`:** Button (primary and secondary), Pill (tone variants), Chip, Card, MetricTile, ThemeToggle, Kbd. Lesson-level components in `components/lesson`: LessonShell, StepCard, Stepper, Takeaways, MetricsRow, CodeBlock. Document each in Storybook with one story per component, and describe the layout in `docs/ARCHITECTURE.md`.

**Accessibility requirements**

- Everything works by keyboard. Focus is always visible, using a 2 px outline.
- The diagram has `role="img"` and an `aria-label` that comes from the current step's `sceneAlt`. The step card is an `aria-live="polite"` region, so a screen reader hears each new step.
- State is never carried by colour alone. Statuses have words, and failures also show an icon or text.
- Text contrast meets WCAG AA in both themes.
- Reduced motion is respected: no packet animation, no transitions, and the final state of each step shows at once.
- Interactive parts use Radix primitives only where the pattern is complex (tabs, dialog, tooltip, switch). Everything else uses native elements.
- On narrow screens the layout stacks, and the diagram scrolls horizontally inside its own container instead of shrinking text below a readable size.

## Lesson outlines for v1

Twelve lessons ship in v1, each with five to seven steps. Lessons 1 and 2 are ported from the prototype with their current text. Lessons 3 to 12 are outlined here, and Claude Code writes their final step text following the content rules below.

**Content rules**

- Original wording only. Do not copy sentences, headings or code from the source article or from the sample site.
- Each step has at most two short paragraphs, one key idea, and one visible change in the diagram.
- Any number drawn in a diagram is labelled as illustrative or simulated.
- Code samples are short (four to six lines) and written for this project.
- Every step has a `sceneAlt` sentence that says what the diagram shows at that moment.

### 1. Optimistic UI (article section 7)

Scene: browser and server panels, one HTTP lane, and a time strip that marks when the UI changes and when the server answers. Reference: the first scene in `reference/prototype.html`.

1. Waiting makes a tap feel broken.
2. Update first, ask later.
3. The server can still say no.
4. Keep a snapshot for the way back.
5. Not every action can bet.
6. A quick test, shown as a verdict table.

### 2. Push + Pull Sync (article section 6)

Scene: browser with a document list and a pending badge, server as source of truth, a push lane for WebSocket events and a pull lane for HTTP, plus a socket status indicator. Reference: the second scene in the prototype.

1. Load with a request.
2. Then something changes.
3. Let the server speak up.
4. Give every event a rule.
5. Confirm with a request.
6. When the socket drops.
7. Which one does the job, shown as a verdict table.

### 3. Virtualization (article sections 10 and 11)

Scene: a scrolling list with a highlighted viewport window, and counters for rows loaded and DOM nodes. Metrics: rows loaded, DOM nodes, render cost.

1. A long list puts thousands of nodes in the DOM.
2. Infinite scroll controls fetching, not rendering.
3. Render only a window: the viewport plus a small buffer.
4. Spacers keep the scrollbar honest.
5. The costs: dynamic heights, keyboard focus, find in page, scroll restoration.
6. When to use it: measure first. Verdict table with rows such as a short paginated table, a feed that keeps loading, and thousands of rendered items.

### 4. Normalized Data (article section 9)

Scene: an API response with nested JSON on the left, an entity store in the middle, three views on the right (feed, profile card, comment list). Metrics: copies of the user, views in sync, writes needed.

1. Nested responses repeat the same user in many places.
2. Renaming a user updates one copy and leaves the others stale.
3. Store each entity once, by id, and reference it.
4. One write now updates every view.
5. Query libraries still need a plan for entity identity and cache updates.
6. The test question: can the same entity appear in more than one place?

### 5. Rendering Isolation (article section 13)

Scene: a component tree where each node shows a render counter that flashes when it re-renders. Metrics: components rendered, wasted renders, where the state lives.

1. One small state change re-renders a whole subtree.
2. Keep state close to where it is used.
3. Split a large context by responsibility.
4. Memoize on purpose: stable props, stable selectors, only costly parts.
5. Contain heavy sections with virtualization and CSS containment.
6. Separation organizes code, isolation limits runtime work. Verdict table.

### 6. State Ownership (article sections 4 and 5)

Scene: five labelled bins (server, client UI, URL, persistent, real-time) and a pile of state items that sort into them, then a click that travels along a one-way path. Metrics: state kinds, unowned items, update path length.

1. Everything lives in one global store.
2. Five kinds of state, each with its own home.
3. Each kind needs different guarantees.
4. Pick the tool after the category.
5. One direction: action, handler, cache or store, UI.
6. Where does it live? Verdict table with a filter value, an open modal, an offer list, a theme choice and a finished background job.

### 7. Requirements First and Component Boundaries (article sections 1 and 2)

Scene: requirement cards on the left (functional and non-functional) and a layer stack on the right (UI primitives, domain components, feature components, pages) that reshapes as requirements change. Metrics: requirements, layers, unclear owners.

1. Architecture starts with requirements, not with tools.
2. Functional and non-functional requirements pull in different directions.
3. A static page and a data-heavy app face different pressure.
4. Splitting only by looks leaves a page component that owns everything.
5. Split by responsibility: primitives, domain, feature, page.
6. Ask the same ownership questions of every component. Verdict table that sorts a button, an offer card, a create form and a page into their layers.

### 8. Container, View, ViewModel (article section 3)

Scene: three columns (container, view model, view) with a backend payload entering on the left and leaving as a UI model on the right. Metrics: backend fields, UI fields, logic left in the view.

1. One component that fetches, decides and renders gets hard to change.
2. Three layers with one job each.
3. The container fetches and mutates.
4. The view model translates the backend shape into a UI shape: labels, status, allowed actions.
5. The view only renders the model, including loading and error states.
6. Why it pays: testable rules, no backend shapes leaking, one place for permission logic. Verdict table that places each task in a layer.

### 9. Backend for Frontend (article section 8)

Scene: a dashboard whose widgets call seven endpoints directly, then the same dashboard calling one endpoint shaped like the screen. Metrics: requests, loading states, services the client knows about.

1. A dashboard calls seven endpoints on its own.
2. The cost: many requests, repeated loading and error states, backend structure leaking in.
3. One endpoint shaped like the screen.
4. The client gets one response and one loading state.
5. The trade-off: too screen-specific, or too generic to help.
6. Rule of thumb: aggregate with purpose, and do not dump unrelated logic into the layer.

### 10. Progressive Rendering (article section 12)

Scene: a dashboard filling in on a simulated timeline, in priority order, shown beside the blocked alternative. Metrics: time to first useful content, time to full load (both simulated), blocked widgets.

1. A blocked page shows nothing until everything is ready.
2. Render the most important parts first.
3. Skeletons hold the layout while data loads.
4. Lazy-load what can wait, with code splitting and Suspense boundaries.
5. Give important requests priority.
6. Measure the time to useful content, not only the time to fully loaded.

### 11. Permission-Aware UI (article section 14)

Scene: one page shown for three roles, with a layers panel for routes, navigation, actions, fields, columns, data and forbidden states. Metrics: visible actions, guarded layers, forbidden states.

1. The backend enforces security, but the frontend must still show permissions correctly.
2. Hiding a button is only one layer.
3. Guard routes and navigation.
4. Guard actions and form fields.
5. Load data with permissions in mind, and design a clear forbidden state.
6. Never let someone fill in a form they cannot submit.

### 12. Errors and Observability (article sections 15 and 16)

Scene: one widget cycling through loading, empty, error, retry and success, beside a production panel of signals labelled as illustrative. Metrics: states handled, errors logged, vitals tracked.

1. In production, failure is normal.
2. Four levels of handling: API, query, component, application.
3. Every feature defines loading, empty, error and retry.
4. Error boundaries and session recovery.
5. You cannot fix what you cannot see: the signals worth watching.
6. Observability belongs in the architecture from the start.

## Quality: tests, performance, CI

Seven automated gates run on every pull request, and a change merges only when all of them pass.

| Gate | Tool | What it checks |
| --- | --- | --- |
| Lint | ESLint with `jsx-a11y` rules | Code rules and obvious accessibility mistakes |
| Format | Prettier | One code style |
| Types | `tsc --noEmit`, strict mode | No implicit `any`, no unchecked content |
| Unit and content | Vitest, Testing Library | Engine behaviour, content validation, UI components |
| End to end | Playwright | Each lesson plays from first to last step using only the keyboard |
| Accessibility | axe-core inside Playwright | No serious or critical violations on the catalog and every lesson, in both themes |
| Performance and build | Lighthouse CI, `next build` | Budgets below, and a successful static export |

**Engine unit tests**

- Frames run in order at their `at` times, using fake timers.
- Pause and resume run each frame exactly once.
- Changing step cancels timers and packets from the previous step.
- Reduced motion applies all frames at once and skips packets.
- A `set` patch replaces arrays whole and leaves other fields untouched.
- Going back and replaying always restarts from `baseState`.

**Test conventions.** Unit tests sit next to the code they cover. End-to-end tests live in `e2e/`. Tests assert on visible text, roles and ARIA labels, not on SVG markup, because markup changes whenever a diagram is redrawn.

**Starting performance budget.** Adjust after the first real measurement and record the change in `docs/DECISIONS.md`.

- Lighthouse at least 95 for performance, accessibility and best practices on the catalog and on one lesson.
- Largest Contentful Paint under 2.5 s on a throttled mobile profile.
- Cumulative Layout Shift of 0 while a lesson plays.
- Lesson page JavaScript under 150 KB gzipped. The catalog page stays close to zero client JavaScript.

**Scripts expected in `package.json`**

```text
dev, build, start, lint, format, typecheck, test, test:e2e, lighthouse
```

**Pull request rules.** One change per pull request. Commit messages follow Conventional Commits. Each pull request description lists what changed, how it was checked and any new dependency with its reason.

## Milestones and acceptance criteria

Build in seven milestones, in this order. Each one ends in a working, deployed state with passing CI, and each milestone is one or more small pull requests.

1. **M0 Bootstrap.** Create the repository with Next.js, TypeScript, Tailwind, ESLint, Prettier, Vitest, Playwright and the GitHub Actions workflow. Connect Vercel. Add `CLAUDE.md`, a README stub and a progress file, docs/PROGRESS.md.
   - Accepted when `pnpm build` produces a static export, CI is green on the empty app, and the deploy URL loads.
2. **M1 Tokens, base UI and Storybook.** Add `tokens.css` with light and dark themes, the no-flash theme script, the components in `components/ui`, and Storybook with one story per component.
   - Accepted when the theme toggle works, both themes pass axe checks, every component is operable by keyboard, and every component has a story in both themes.
3. **M2 Lesson engine.** Add the types, `useLessonPlayer`, the packet helpers, engine unit tests and the content validation test.
   - Accepted when all engine tests pass and a dummy lesson plays on a test page.
4. **M3 Port lessons 1 and 2.** Move the prototype lessons into `content/lessons` and `components/scenes`.
   - Accepted when both lessons match `reference/prototype.html` in text, step order, animation behaviour and keyboard controls, and the end-to-end test plays both. The owner checks the look against the prototype.
5. **M4 App shell.** Build the catalog, lesson routes, `?step=` deep links, saved progress, next-lesson navigation, a 404 page and page metadata.
   - Accepted when every route is statically generated and the performance budget is met.
6. **M5 New lessons 3 to 12.** One pull request per lesson, in table order.
   - Accepted per lesson when content validation passes, the end-to-end test plays it, axe is clean, and it has been checked at desktop and phone width.
7. **M6 Polish and launch.** Write the README with screenshots, finish `docs/`, add social preview images, run a manual screen reader pass and a final Lighthouse run.
   - Accepted when the success criteria in the first section all hold on the deployed site with all twelve lessons.

**Owner checkpoints.** Stop and ask the owner for a decision after M1 (look and feel), after M3 (parity with the prototype), after the first new lesson in M5 (style of new scenes), and after lesson 6, before starting the less visual lessons 7 to 12.

**After v1.** Further lessons and any translations follow as one pull request each, using the same process.

## CLAUDE.md and repo docs

The repository carries a `CLAUDE.md` that tells Claude Code how to work in it, plus five human-readable documents. Create all six in M0 and keep them current. The `CLAUDE.md` below is the starting text.

```markdown
# Pattern Lab

Static Next.js site of animated lessons on frontend architecture patterns.
Spec: docs/SPEC.md. Visual reference: reference/prototype.html (not shipped).

## Commands
- pnpm dev | build | lint | typecheck | test | test:e2e | format
- Before every commit: pnpm lint && pnpm typecheck && pnpm test && pnpm build

## Architecture rules
- Lessons are typed data in content/lessons. Scenes are React components in
  src/components/scenes. The engine is in src/engine. Keep these apart.
- Adding a lesson must not change src/engine. If it seems to, stop and ask.
- Scenes are pure: state in, SVG out. No timers, no globals, no hard-coded colours.
- Server components by default. Client components only for the player and scenes.
- Colours and spacing come from tokens in src/styles/tokens.css.

## Content rules
- Write lesson text in original words. Never copy from the source article or the sample site.
- Numbers drawn in diagrams are labelled illustrative or simulated.
- Every step needs a sceneAlt sentence.
- No visible text hard-coded in components or scenes. Lesson text goes in content/,
  interface text in messages/en.json. English only for now, but keep it translation-ready.

## Dependencies
- Add a dependency only with a one-sentence reason in docs/DECISIONS.md.
- Do not add shadcn/ui, Redux, Zustand, React Query or a database.

## Definition of done
- Lint, types, unit, end-to-end and axe checks pass.
- Keyboard-only and reduced-motion behaviour checked.
- One change per pull request. Conventional Commits.
- Tick the item in docs/PROGRESS.md in the same pull request, only after its checks pass.

## Ask the owner before
- Changing the visual direction, the lesson list, or the stack.
- Continuing past the owner checkpoints in the spec.
```

**Repo documents**

| File | Purpose |
| --- | --- |
| `README.md` | What the project is, a screenshot or GIF, the live link, how to run and test it, credits |
| `docs/SPEC.md` | This specification, exported as Markdown |
| `docs/ARCHITECTURE.md` | The folder layout, data flow from lesson data through the player to the scene, and the playback rules |
| `docs/DECISIONS.md` | Short decision records: date, decision, reason, alternatives. Includes every dependency and its reason |
| `docs/ADDING_A_LESSON.md` | The five steps for adding a lesson, with a worked example |

**Progress tracker.** `docs/PROGRESS.md` lists milestones M0 to M6 and the twelve lessons as checkboxes. Create it in M0. Tick an item only in the pull request that meets its acceptance criteria, after lint, type check, tests and build pass. Never tick on a guess.

## Decisions and legal notes

All six decisions are made, so Claude Code can start M0 without asking about them.

**Decided**

- Repository: `frontend-pattern-lab`, public.
- Storybook: included in M1.
- Scope: all twelve lessons in v1.
- Address: a Vercel subdomain, `frontend-pattern-lab.vercel.app` if it is free.
- Language: English only at launch, with translation-ready code.
- Licences: MIT for the code, CC BY 4.0 for the original lesson text and diagrams.

**Attribution and legal notes**

- The source article is credited in the site footer and the README. Its images are not reused, and its text is restated, not quoted.
- From the sample site, only the general idea of stepping through an animated diagram is used. Its copy, illustrations, icon style and layout details are not copied. The visual language here is the project's own.
- Fonts are loaded through `next/font` from open-licence families. Confirm each licence when adding the fonts.
- This is not legal advice. If the site is promoted widely, consider telling the article's author and the sample site's author about it.

**Licences.** MIT for the code and CC BY 4.0 for the original lesson text and diagrams. Add `LICENSE` and `LICENSE-CONTENT.md` in M0, and say in the README which one covers what. CC BY covers only the project's own wording and drawings, not the ideas it credits to others.

**Credit wording.** Footer: "Original explanations of ideas from \[article title\] by Dmitrii Lobanov. The step-by-step diagram format is inspired by \[sample site\]." Both links stay live. The README repeats this in an Acknowledgements section.
