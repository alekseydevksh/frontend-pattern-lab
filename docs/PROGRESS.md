# Progress

Tick an item only in the pull request that meets its acceptance criteria, after lint, type
check, tests and build pass. Never tick on a guess.

## Milestones

- [x] M0 Bootstrap
- [x] M1 Tokens, base UI and Storybook
- [x] M2 Lesson engine
- [ ] M3 Port lessons 1 and 2
- [ ] M4 App shell
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

## Lessons

- [ ] 1. Optimistic UI
- [ ] 2. Push + Pull Sync
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
