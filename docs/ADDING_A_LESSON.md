# Adding a lesson

> Stub. A worked example is added in M3, once the first lessons are ported.

1. Create `content/lessons/<slug>.ts` exporting a `Lesson` object.
2. Create `src/components/scenes/<Name>Scene.tsx` that follows the scene contract, and
   register it in `src/components/scenes/registry.ts`.
3. Add the lesson to `content/lessons/index.ts` at its position.
4. Run the lesson-data validation test and the end-to-end smoke test.
5. Open one pull request titled `Add lesson: <title>`.

Adding a lesson must not change `src/engine`. If it seems to, stop and ask.
