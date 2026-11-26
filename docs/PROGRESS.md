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

## Lessons

- [x] 1. Optimistic UI
- [x] 2. Push + Pull Sync
- [ ] 3. Virtualization
- [ ] 4. Normalized Data
- [ ] 5. Rendering Isolation
- [ ] 6. State Ownership
- [ ] 7. Requirements First and Component Boundaries
- [ ] 8. Container, View, ViewModel
- [ ] 9. Backend for Frontend
- [ ] 10. Progressive Rendering
- [ ] 11. Permission-Aware UI
- [ ] 12. Errors and Observability
