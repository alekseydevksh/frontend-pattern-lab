# Adding a lesson

One data file, one scene, and one line in each of the two registries:

1. Create `content/lessons/<slug>.ts` exporting a `Lesson` object (the data file).
2. Create `src/components/scenes/<Name>Scene.tsx` that follows the scene contract (the scene).
3. Register them. Nothing is imported by hand anywhere else:
   - in `src/components/scenes/registry.ts`, add an entry for the lesson's `sceneId` (copy the one above
     it): `load` and `View` each name the scene file with their own `import()`, and that is what makes the
     scene its own chunk, loaded only by the lesson that uses it;
   - in `content/lessons/index.ts`, add the lesson's loader line:
     `'<slug>': () => import('./<slug>').then((m) => m.<exportName>)`;
   - in `content/lessons/catalog.ts`, change the lesson's entry from `status: 'soon'` to `status: 'ready'`
     and add its `minutes` and `stepCount`. The slug, title, summary, track, minutes and step count in the
     catalog must equal the lesson's (a test checks it, so the catalog never has to load a lesson).
     Nothing else changes: the catalog card, the route, the sitemap entry, the "Lesson N of 12"
     breadcrumb and the previous lesson's "Next lesson" button all follow from these.
4. Run the lesson-data validation test (`pnpm test`) and the end-to-end tests (`pnpm test:e2e`). The
   validation test fails with a message that names the lesson, the step and the rule: a repeated
   step id, a `takeawayIndex` out of range, frames not sorted by `at`, a `sceneId` missing from the
   registry, a packet on a lane the scene does not define, an empty `sceneAlt`, and more (see
   `src/engine/validate.ts`). After `pnpm build`, `pnpm budget` checks that the new lesson page loads
   under 150 KB of gzipped JavaScript and has a scene file of its own; CI runs it too.
   `pnpm screenshots <slug>` then takes a picture of every step, in both themes, at desktop and phone
   width, for the visual check (see the procedure below).
5. Open one pull request titled `Add lesson: <title>`.

The full checklist, with the branch, the tests, the budget and what the pull request says, is the
[new lesson procedure](#new-lesson-procedure) at the end of this file.

The lesson page then loads the lesson's own data and scene, and no other lesson's. The catalog never
loads a lesson or a scene.

Adding a lesson must not change `src/engine`. If it seems to, stop and ask.

The scene follows the scene contract in [ARCHITECTURE.md](ARCHITECTURE.md): a `viewBox`, its
`lanes`, a pure `Component` that draws a state, and `metrics`. It does not draw packets or the
`<svg>` element; the player does. The lesson is typed `Lesson<S>` with the state type `S` that
its scene draws.

## Worked example: lesson 2, Push + Pull Sync

**The scene** (`src/components/scenes/PushPullScene.tsx`) exports the state type, the drawing and
the definition. Every word it draws is a field of the state:

```tsx
export interface PushPullState {
  labels: PushPullLabels; // "BROWSER", "socket {status}", "in sync", ...
  docs: [string, string, string];
  ui: Array<DocStatus | null>; // what the browser shows
  srv: DocStatus[]; // what the server holds
  badge: number | null;
  socket: 'open' | 'down';
  // ...
}

export const pushPullScene: SceneDefinition<PushPullState> = {
  viewBox: '0 0 640 312',
  lanes: {
    push: { x1: 388, x2: 252, y: 120 }, // server to browser
    pull: { x1: 252, x2: 388, y: 210 }, // browser to server
  },
  Component: PushPullDrawing, // pure: state in, SVG out
  metrics: (state) => [/* three values computed from the state */],
};
```

Colours are token classes (`fill-res-text`, `stroke-line`, `fill-on-signal`); text on a filled colour
uses `fill-on-signal` on `fill-bad`, `fill-ev`, `fill-req-solid` or `fill-res-solid` (D12).
Register it in `scenes/registry.ts`:

```ts
'push-pull-sync': {
  load: () => import('./PushPullScene').then((m) => m.pushPullScene),
  View: dynamic(() =>
    import('./PushPullScene').then((m) => ({ default: bindScene(m.pushPullScene) })),
  ),
},
```

**The lesson** (`content/lessons/push-pull-sync.ts`) is plain data. A step names its text, and a list
of frames, each with a time and a patch of the state, and optionally a packet:

```ts
{
  id: 'server-speaks-up',
  tag: 'PUSH', tone: 'ev',
  title: 'Let the server speak up',
  shortTitle: 'Give events a rule',      // the "Next: ..." button on this step names the next step
  body: ['Keep a WebSocket or Server-Sent Events stream open. ...'],
  keyIdea: 'Push says something changed. It does not have to carry the whole truth.',
  code: { language: 'json', source: '{ "type": "DOCUMENT_SIGNED", ... }' },
  takeawayIndex: 1,                      // ticks "Push says something changed, ..."
  sceneAlt: 'A DOCUMENT_SIGNED packet travels along the push lane ...',
  startState: { srv: ['pending', 'signed', 'signed'] },      // merged over baseState
  frames: [
    { at: 300, packet: { lane: 'push', label: 'DOCUMENT_SIGNED', tone: 'ev' } },
    { at: 1200, set: { event: 'DOCUMENT_SIGNED' } },
  ],
}
```

The last step of a lesson can carry a `summary` (a title and rows of label, verdict and tone): the
shell then shows a verdict table in place of the diagram, and the step has no frames.

**The registry** (`content/lessons/index.ts`) gets
`'push-pull-sync': () => import('./push-pull-sync').then((m) => m.pushPullSync)`, and `catalog.ts` has
its entry set to `ready`, with `minutes: 5, stepCount: 7`. The page `/lessons/push-pull-sync/` then
exists, with no change to the engine, the shell or the routes. Run `pnpm test`: the validation test, and `prototype-parity.test.ts` for the two ported
lessons, must pass.

## New lesson procedure

The checklist for "go ahead with lesson N", from lesson 3 on. Follow it in order. It is enough on its
own: nothing else needs to be said to start the next lesson.

**1. Before starting**

- Check that the previous lesson's pull request is merged (`gh pr list --state all --limit 5`). If it is
  not, tell the owner and wait.
- `git checkout main && git pull --ff-only`, then create `m5-lesson-NN-<slug>`: `NN` is the lesson
  number with two digits, `<slug>` the slug in `content/lessons/catalog.ts` (for example
  `m5-lesson-04-normalized-data`).
- Read `CLAUDE.md`, `docs/PROGRESS.md`, `docs/SPEC.md` (the lesson's outline and the content rules in
  section 7, section 5, the M5 entry in section 9), this file, `docs/DECISIONS.md`, the data and scene of
  the lesson before it, and `reference/prototype.html` for the visual language.
- Give the owner a short plan. Ask only if something blocks you.

**2. The files**

| File                                         | What goes in it                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/lessons/<slug>.ts`                  | The `Lesson`: five to seven steps. Each step has at most two short paragraphs, a key idea, frames, packets where they help, a `sceneAlt` sentence and a `takeawayIndex`; a `summary` (verdict table) where the outline asks for one. Every word the scene draws is in the state.                                                                                                  |
| `src/components/scenes/<Name>Scene.tsx`      | The `SceneDefinition`: pure, no state, no timers, no hard-coded colours or text. Positions of markers and similar details live in the lesson data.                                                                                                                                                                                                                                |
| `src/components/scenes/<Name>Scene.test.tsx` | Unit tests of the scene: what it draws for a state, its metrics, and the same picture for the same state.                                                                                                                                                                                                                                                                         |
| `src/components/scenes/registry.ts`          | One entry (copy the one above it).                                                                                                                                                                                                                                                                                                                                                |
| `content/lessons/index.ts`                   | One loader line.                                                                                                                                                                                                                                                                                                                                                                  |
| `content/lessons/catalog.ts`                 | The entry set to `ready`, with `minutes` and `stepCount`.                                                                                                                                                                                                                                                                                                                         |
| `e2e/lesson-NN-<slug>.spec.ts`               | Plays the lesson from the first step to the last with the keyboard against a frozen clock, and checks the metrics after the frames, the verdict table, the takeaways, pause and replay, reduced motion, no sideways scroll at 375 px, and axe in both themes on every step and with a packet in flight. Use `e2e/lesson-helpers.ts`; copy `e2e/lesson-03-virtualization.spec.ts`. |
| `docs/DECISIONS.md`                          | A record for the choices the spec did not settle.                                                                                                                                                                                                                                                                                                                                 |
| `docs/PROGRESS.md`                           | The lesson ticked, under the conditions in step 5.                                                                                                                                                                                                                                                                                                                                |

Content rules: original words only; take the idea from the spec outline, never copy or closely paraphrase
the source article or the sample site. A number drawn in a diagram is labelled illustrative or
simulated: say so in the drawing (as lesson 3's "illustrative numbers") and in the first step's text.

These run for every ready lesson without being edited: content validation and the catalog test
(`pnpm test`), the step card and layout-shift checks at desktop and phone width
(`e2e/step-card.spec.ts`, `e2e/layout-shift.spec.ts`), the metric labels at 375 px
(`e2e/metric-labels.spec.ts`), the catalog, sitemap and next-lesson checks (`e2e/shell.spec.ts`), and
the budget. The previous lesson's last step now offers this lesson: its spec reads the label from the
catalog (`lastStepButton`), so it needs no edit either.

Stop and ask before changing `src/engine`, adding a dependency, or changing an existing lesson.

**3. The checks**

Run all of them, and keep the numbers for the pull request:

```text
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test
pnpm build && pnpm budget
pnpm test:e2e
pnpm build-storybook
LIGHTHOUSE_LESSON=<slug> pnpm lighthouse
```

The budget: a lesson page loads under 150 KB of gzipped JavaScript, the catalog under 145 KB. Do not move
the limits and do not trim app code to fit: if the new page is over, stop and report the numbers.

**4. The screenshots**

`pnpm screenshots <slug>` (after `pnpm build`) saves every step, light and dark, at 1280 and 375 px, to
`../pattern-lab-screenshots/<slug>/`, next to the repository and outside git (`--out <folder>` to
choose another). Look at every picture yourself before handing over: text that collides, runs out of a
panel or is cut off is a bug to fix first. Give the owner the folder's path.

**5. Ticking**

Tick the lesson in `docs/PROGRESS.md` only if content validation passes, the end-to-end test plays it,
axe is clean, and it was checked at desktop and phone width. Say clearly that the owner still checks the
look.

**6. The pull request, and stop**

- Small Conventional Commits, one per logical step. Push the branch and open one pull request titled
  `Add lesson: <title>` with the GitHub CLI, only when every check above passes locally.
- The description holds: a summary; the acceptance criteria with their status; the result of every check,
  including the lesson page's JavaScript size and the Lighthouse numbers; the screenshot folder; the
  decisions the spec did not settle; open questions.
- Wait for CI on the branch and report the result. Never merge. Then stop and wait for "go ahead with
  lesson N+1". The spec's owner checkpoints are after lesson 3 (the style of the new scenes) and after
  lesson 6 (before the less visual lessons 7 to 12).
