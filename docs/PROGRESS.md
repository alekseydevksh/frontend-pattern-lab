# Progress

Tick an item only in the pull request that meets its acceptance criteria, after lint, type
check, tests and build pass. Never tick on a guess.

## Milestones

- [x] M0 Bootstrap
- [x] M1 Tokens, base UI and Storybook
- [x] M2 Lesson engine
- [x] M3 Port lessons 1 and 2
- [x] M4 App shell
- [ ] M5 New lessons 3 to 12
  - [x] M5 prep: lazy scene loading, the JavaScript budget in CI, a step card that keeps its height, scene state in lesson data, the catalog in lesson order
- [ ] M6 Polish and launch

### M0 acceptance criteria

- [x] `pnpm build` produces a static export
- [x] CI is green on the empty app (run 45723540889 on main)
- [x] The deploy URL loads (https://frontend-pattern-lab.vercel.app)

### M1 acceptance criteria

- [x] The theme toggle works (e2e: switches, sets `aria-pressed`, persists across reload)
- [x] Both themes pass axe (e2e: component gallery and catalog, light and dark, plus system preference)
- [x] Every component is operable by keyboard (e2e: Tab order, 2 px focus ring, Enter and Space)
- [x] Every component has a story in both themes (7 `BothThemes` stories, guarded by a unit test)

### M2 acceptance criteria

- [x] All engine tests pass (119 in `src/engine/`: scheduling order, pause and resume, replay,
      jumping between steps, reduced motion, the injectable clock, the first-paint state, keys,
      packets, patches and the validation rules)
- [x] The content validation test runs over every lesson in `content/lessons` (the registry is
      empty until M3, so the rules are proven with broken lessons, and the dummy lesson passes them)
- [x] The dummy lesson plays on the test page `/dev/player/` (e2e: first to last step with the
      keyboard alone, pause and resume, replay, reduced motion, axe in both themes)

### M3 acceptance criteria

- [x] Both lessons match `reference/prototype.html` in text, step order and animation behaviour
      (`content/lessons/prototype-parity.test.ts` loads the prototype and compares text, tags,
      step order, frame times, packets, the scene state after every frame, metrics and verdict
      tables)
- [x] Both lessons match the prototype's keyboard controls (arrows, `R`, Space; e2e). One
      difference, agreed in the M2 answers: the arrow past the last step waits for M4
- [x] The end-to-end test plays both lessons from the first step to the last with the keyboard,
      checks the metrics and the verdict tables, and runs axe in both themes on every step
- [x] Reduced motion and keyboard-only use checked (e2e, both lessons)
- [ ] The owner checks the look against the prototype (screenshots: see the pull request)

### M4 acceptance criteria

- [x] Every route is statically generated (`pnpm build` lists `/`, `/_not-found`, the two `/dev/`
      pages, `/lessons/optimistic-ui`, `/lessons/push-pull-sync`, `/robots.txt` and `/sitemap.xml`
      as static; no route is dynamic)
- [x] Lighthouse (mobile profile, median of 5 runs) on the catalog and a lesson page: performance 100,
      accessibility 100, best practices 100 (budget: at least 95)
- [x] Largest Contentful Paint 0.75 s on both pages (budget: under 2.5 s)
- [x] Cumulative Layout Shift 0 on both pages, and 0 while every step of both lessons plays, on
      desktop and phone (e2e). A step change reflows the page by 0.06 to 0.08 on desktop, which the CLS
      metric does not count because the learner caused it: see D13
- [x] Lesson page JavaScript 147.1 KB gzipped (budget: under 150 KB). The framework alone is 139.2 KB,
      so there is 2.9 KB of headroom: see D13 and the pull request
- [x] The catalog, `?step=` deep links, saved progress, next-lesson navigation, the 404 page and page
      metadata work (unit and e2e tests; axe on the catalog and the 404 page in both themes)

### M5 prep acceptance criteria

Not a lesson: the five things the owner asked for before lesson 3 (D14).

- [x] A lesson page loads only its own scene and lesson data, the catalog only the catalog entries, the
      first paint is the full start state from the server, and nothing shifts (the export's lesson pages
      each load a scene file of their own; the catalog loads none)
- [x] The 150 KB gzipped lesson JavaScript limit is a CI step (`pnpm budget`), measured per route from the
      export: catalog 139.2 KB, lessons 148.5 KB and 148.4 KB (before: 139.2, 147.1, 147.1)
- [x] The step card keeps its height: the elements below it do not move between steps, on desktop and
      phone, for both lessons (`e2e/step-card.spec.ts`), and a screen reader hears each step once
- [x] Scenes hold no state: the time markers' position is in the lesson data; the prototype parity test
      passes with one recorded difference
- [x] The catalog is one list in lesson order, numbered 1 to 12, with the track as a label on each card

### Lesson 3 acceptance criteria

- [x] Content validation passes (`pnpm test`: `content/lessons/lessons.test.ts` and the catalog test)
- [x] The end-to-end test plays it from the first step to the last with the keyboard, and checks the metrics
      and the verdict table (`e2e/lesson-03-virtualization.spec.ts`)
- [x] axe is clean in both themes, on the final state of every step and with a packet in flight
- [x] Checked at desktop (1280 px) and phone width (375 and 390 px): no layout shift, the step card keeps its
      height, the metric labels fit, the page never scrolls sideways; screenshots of every step in both themes
- [x] Lesson page JavaScript 149.3 KB gzipped (limit 150 KB); catalog 139.2 KB (limit 145 KB)
- [x] The owner checks the look (owner checkpoint: the style of the new scenes; accepted for lessons 4 to 6, D16)

### M5 registry split acceptance criteria

Not a lesson: the preparation the owner asked for before lesson 4 (D16).

- [x] Each lesson page ships only its own scene: one route folder per lesson, no map of scenes in the browser
- [x] Adding a lesson is one data file, one scene and one page file, plus the catalog entry; no registry lines
      (`docs/ADDING_A_LESSON.md` and its new lesson procedure updated)
- [x] `pnpm budget` fails a lesson page that carries or names another lesson's scene, and the catalog if it
      carries or names any (`scripts/js-budget.test.ts`; also checked by breaking a real build two ways)
- [x] Lesson pages 146.3, 146.3 and 147.1 KB gzipped (before: 148.6, 148.5, 149.3; limit 150 KB); catalog
      139.2 KB (limit 145 KB)
- [x] `src/engine` unchanged; lint, types, unit, end-to-end, axe, Storybook build and Lighthouse pass

## Lessons

- [x] 1. Optimistic UI
- [x] 2. Push + Pull Sync
- [x] 3. Virtualization
- [ ] 4. Normalized Data
- [ ] 5. Rendering Isolation
- [ ] 6. State Ownership
- [ ] 7. Requirements First and Component Boundaries
- [ ] 8. Container, View, ViewModel
- [ ] 9. Backend for Frontend
- [ ] 10. Progressive Rendering
- [ ] 11. Permission-Aware UI
- [ ] 12. Errors and Observability
