# Adding a lesson

> A worked example is added in M3, once the first lessons are ported. The engine and the
> player test page (`/dev/player/`, with `content/dev/dummy-lesson.ts` and
> `components/scenes/dev/DummyScene.tsx`) are a small complete example in the meantime.

1. Create `content/lessons/<slug>.ts` exporting a `Lesson` object.
2. Create `src/components/scenes/<Name>Scene.tsx` that follows the scene contract, and
   register it in `src/components/scenes/registry.ts`.
3. Add the lesson to `content/lessons/index.ts` at its position.
4. Run the lesson-data validation test (`pnpm test`) and the end-to-end smoke test. The
   validation test fails with a message that names the lesson, the step and the rule: a repeated
   step id, a `takeawayIndex` out of range, frames not sorted by `at`, a `sceneId` missing from the
   registry, a packet on a lane the scene does not define, an empty `sceneAlt`, and more (see
   `src/engine/validate.ts`).
5. Open one pull request titled `Add lesson: <title>`.

Adding a lesson must not change `src/engine`. If it seems to, stop and ask.

The scene follows the scene contract in [ARCHITECTURE.md](ARCHITECTURE.md): a `viewBox`, its
`lanes`, a pure `Component` that draws a state, and `metrics`. It does not draw packets or the
`<svg>` element; the player does. The lesson is typed `Lesson<S>` with the state type `S` that
its scene draws.
