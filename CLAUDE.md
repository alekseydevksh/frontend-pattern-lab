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
