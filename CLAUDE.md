# Pattern Lab

Static Next.js site of animated lessons on frontend architecture patterns.
Spec: docs/SPEC.md. Visual reference: reference/prototype.html (not shipped).

## Commands

- pnpm dev | build | lint | typecheck | test | test:e2e | format | storybook | build-storybook
- pnpm budget (size table) | check:lesson <slug> (every check for a lesson, as a markdown report)
- Before every commit: pnpm lint && pnpm typecheck && pnpm test && pnpm build

## Architecture rules

- Lessons are typed data in content/lessons. Scenes are React components in
  src/components/scenes. The engine is in src/engine. Keep these apart.
- Adding a lesson must not change src/engine. If it seems to, stop and ask.
- Scenes are pure: state in, SVG out. No timers, no globals, no hard-coded colours.
- A scene imports no other scene and no lesson data. Only scenes import `src/components/scenes/sceneKit.tsx`;
  only tests import `sceneTest.tsx` (lint and `boundaries.test.ts` enforce it).
- Server components by default. Client components only for the player and scenes.
- Colours and spacing come from tokens in src/styles/tokens.css.

## Content rules

- Write lesson text in original words. Never copy from the source article or the sample site.
- Numbers drawn in diagrams are labelled illustrative or simulated.
- Editorial rules (when not to use a pattern, verified modern notes, the fact log, no library names): docs/EDITORIAL.md.
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

## Git workflow

- One branch per milestone, created from an up-to-date main: m1-tokens-base-ui,
  m2-lesson-engine, m3-port-lessons, and so on. In M5, one branch and one pull
  request per lesson: m5-lesson-03-virtualization, and so on.
- Never commit to main directly. Never merge a pull request. The owner merges them.
- Small Conventional Commits, one per logical step.
- At the end of a milestone, push the branch and open ONE pull request with the
  GitHub CLI. The description contains: a summary, the acceptance criteria with their
  status, the results of every check, and open questions.
- Open the pull request only when lint, type check, unit tests, build, end-to-end
  tests and the Storybook build all pass locally, then wait for CI on the branch and
  report the result. Do not open it with a red check unless the owner said to; in that
  case say clearly what fails.
- Tick the milestone in docs/PROGRESS.md in the same pull request, only if every
  acceptance criterion is met.
- On "go ahead with M2" (or any later milestone): first check that the previous pull
  request is merged, pull main, and only then create the next branch. If it is not
  merged, tell the owner and wait.
- On "go ahead with lesson N": follow the "New lesson procedure" in docs/ADDING_A_LESSON.md. Run
  `pnpm check:lesson <slug>` for every check and the block to paste, and open the pull request from
  `.github/PULL_REQUEST_TEMPLATE/lesson.md` (`gh pr create --template lesson.md`).
- On "go ahead with lessons N and M": two lessons at a time. Do lesson N in full and open its pull request
  against main. Create lesson M's branch from lesson N's branch (not from main), do M in full, and open its
  pull request against lesson N's branch. With both pull requests open, report both and stop. Never merge.
  After the owner merges N, retarget M's pull request to main (`gh pr edit <M> --base main`). See "Two
  lessons at a time" in docs/ADDING_A_LESSON.md.

## Ask the owner before

- Changing the visual direction, the lesson list, or the stack.
- Continuing past the owner checkpoints in the spec.
