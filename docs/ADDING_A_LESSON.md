# Adding a lesson

1. Create `content/lessons/<slug>.ts` exporting a `Lesson` object.
2. Create `src/components/scenes/<Name>Scene.tsx` that follows the scene contract, and
   register it in `src/components/scenes/registry.ts`.
3. Add the lesson to `content/lessons/index.ts` at its position, and change its entry in
   `content/lessons/catalog.ts` from `status: 'soon'` to `status: 'ready'`. The slug, title,
   summary and track in the catalog must equal the lesson's (a test checks it). Nothing else
   changes: the catalog card, the route, the sitemap entry, the "Lesson N of 12" breadcrumb and the
   previous lesson's "Next lesson" button all follow from the registry and the catalog.
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
Register it: `'push-pull-sync': pushPullScene` in `scenes/registry.ts`.

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

**The registry** (`content/lessons/index.ts`) gets `import { pushPullSync } from './push-pull-sync'` and
the entry, and `catalog.ts` has its entry set to `ready`. The page `/lessons/push-pull-sync/` then
exists, with no change to the engine, the shell or the routes. Run `pnpm test`: the validation test, and `prototype-parity.test.ts` for the two ported
lessons, must pass.
