import type {
  Field,
  LayersState,
  Line,
  OfferModel,
  RequestState,
} from '@/components/scenes/ContainerViewScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 8, Container, View, ViewModel (article section 3). New in M5: the text is written for this
 * project from the outline in docs/SPEC.md and the rules in docs/EDITORIAL.md. The scene is
 * components/scenes/ContainerViewScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * offer, its payload and the requests are illustrative; the diagram and step 1 say so.
 */

const fetching = (text: string): Line => ({ job: 'fetch', text });
const deciding = (text: string): Line => ({ job: 'decide', text });
const drawing = (text: string): Line => ({ job: 'draw', text });

/** The single component: fetching, deciding and drawing in the order they sit in the code. */
const tangle: Line[] = [
  fetching("const offer = await fetch('/offers/7')"),
  deciding('const price = offer.price_cents / 100'),
  drawing("<p>{'$' + price.toFixed(2)}</p>"),
  deciding("const label = offer.status_code === 1 ? 'Active' : 'Paused'"),
  drawing('<Pill>{label}</Pill>'),
  deciding('const left = offer.expires_at - Date.now()'),
  deciding("const canEdit = role === 'admin' && offer.can_edit"),
  fetching("await fetch('/offers/7', { method: 'PATCH' })"),
];

/** The decisions as the view holds them once the layers exist; the view model takes them over. */
const logic: Line[] = [
  deciding('price_cents / 100'),
  deciding('status_code === 1'),
  deciding('expires_at - Date.now()'),
  deciding("role === 'admin'"),
];
/** What is left in the view after the view model has built its first `n` fields. */
const logicAfter = (mapped: number): Line[] => logic.slice(Math.max(0, mapped - 1));

const payload: Field[] = [
  { name: 'title', value: '"Spring sale"' },
  { name: 'price_cents', value: '1999' },
  { name: 'status_code', value: '1' },
  { name: 'expires_at', value: '1767225600' },
  { name: 'owner_id', value: '"u_41"' },
  { name: 'region', value: '"eu-2"' },
  { name: 'can_edit', value: 'true' },
];

const model: OfferModel = {
  title: 'Spring sale',
  price: '$19.99',
  status: 'Active',
  expiry: '3 days left',
  actions: ['Edit', 'Pause'],
};

const MAPPED = 5;

/** The container's state, as a patch: the requests it has made and what it holds. */
const held = (request: RequestState = 'ready'): Partial<LayersState> => ({
  calls: ['GET /offers/7', 'PATCH /offers/7'],
  request,
  payload,
});

const baseState: LayersState = {
  labels: {
    illustrative: 'illustrative offer · simulated requests',
    oneComponent: 'ONE COMPONENT · OfferPage',
    oneComponentNote: 'fetches, decides, draws',
    jobs: { fetch: 'FETCH', decide: 'DECIDE', draw: 'DRAW' },
    columns: ['CONTAINER', 'VIEW MODEL', 'VIEW'],
    roles: ['fetches and sends changes', 'turns it into screen words', 'draws what it is given'],
    payload: 'RAW PAYLOAD',
    request: 'request: {state}',
    requestStates: { idle: 'idle', loading: 'loading', ready: 'ready', error: 'failed' },
    modelFields: ['title', 'price', 'status', 'expiry', 'actions'],
    from: ['title', 'price_cents', 'status_code', 'expires_at', 'can_edit'],
    fromTemplate: 'from {name}',
    leftOut: 'left out: owner_id, region',
    logicHere: 'LOGIC IN THE VIEW',
    blank: 'nothing to draw yet',
    loading: 'LOADING…',
    error: 'COULD NOT LOAD',
    retry: 'Try again',
  },
  tangled: false,
  tangle,
  calls: [],
  request: 'idle',
  payload: [],
  mapped: 0,
  model,
  logic,
  view: 'blank',
};

export const containerViewViewmodel: Lesson<LayersState> = {
  slug: 'container-view-viewmodel',
  order: 8,
  track: 'Structure',
  title: 'Container, View, ViewModel',
  summary: 'Separate fetching, translating and drawing so each part can change on its own.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [3],
  takeaways: [
    'One component that fetches, decides and draws is hard to change',
    'Split it into three layers, each with one job',
    'The container fetches, and sends the changes back to the backend',
    'The view model turns the backend shape into screen words and allowed actions',
    'The view only draws the model it is given, loading and error included',
    'Pay for the layers when rules need tests and one home; a hook or one component can be enough',
  ],
  metricLabels: ['Backend fields', 'UI fields', 'Logic in view'],
  sceneId: 'container-view-viewmodel',
  baseState,
  steps: [
    {
      id: 'one-component',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'One component does it all',
      shortTitle: 'Three layers',
      body: [
        'An offer card fetches its offer, works out the price, the status label, the time left and the allowed buttons, and then draws them, all in one component. Its seven backend fields arrive raw, and four decisions sit among the markup. The offer, its payload and the requests are illustrative.',
        'Change the backend, a label or a permission rule and you edit the same file, between lines that have nothing to do with it.',
      ],
      keyIdea: 'When one component fetches, decides and draws, every kind of change lands in it.',
      takeawayIndex: 0,
      sceneAlt:
        'One wide box, titled one component, offer page, says it fetches, decides and draws. Eight rows of code are tagged with a word: fetch, decide or draw, mixed together in the order they sit in the code. A request packet leaves for the backend and a payload packet comes back, and seven raw payload fields appear above the rows. The metrics show 7 backend fields, 0 UI fields and 4 decisions of logic in the view.',
      startState: { tangled: true },
      frames: [
        { at: 300, packet: { lane: 'backend', dir: 'back', label: 'GET offer', tone: 'req' } },
        { at: 1300, packet: { lane: 'backend', label: 'payload', tone: 'res' } },
        { at: 2300, set: { payload } },
      ],
    },
    {
      id: 'three-layers',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Three layers, one job each',
      shortTitle: 'The container',
      body: [
        'Split the component by job. The container talks to the backend. The view model turns what it got into what the screen needs. The view draws.',
        'Each layer now has a reason to change that the other two do not share. For now the decisions are still in the view; the next steps move them out.',
      ],
      keyIdea: 'Split by the reason to change: the backend, the rules, or the pixels.',
      takeawayIndex: 1,
      sceneAlt:
        'The single box splits into three columns: container, which fetches and sends changes; view model, which turns it into screen words; and view, which draws what it is given. The container and the view model are empty. The view still lists four decisions under the heading logic in the view, above a dashed box that says nothing to draw yet. The metrics show 0 backend fields, 0 UI fields and 4 decisions of logic in the view.',
      startState: { tangled: true },
      frames: [{ at: 600, set: { tangled: false } }],
    },
    {
      id: 'container',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'The container fetches and mutates',
      shortTitle: 'The view model',
      body: [
        'The container asks the backend for the offer and holds the raw payload. When the user pauses the offer, it sends that change back too. It knows the request, the loading state and the failure, and nothing about how a price is written.',
        'It hands what it holds to the next layer as it is.',
      ],
      keyIdea:
        'The container owns the conversation with the backend, and nothing about the screen.',
      code: {
        language: 'tsx',
        source:
          'function OfferContainer({ id }: { id: string }) {\n  const offer = useOfferRequest(id); // GET\n  const pause = () => patchOffer(id); // PATCH\n  return <OfferScreen offer={offer} pause={pause} />;\n}',
      },
      takeawayIndex: 2,
      sceneAlt:
        'In the container column a request line reads loading, with GET offer slash 7 under it. A request packet goes to the backend and a payload packet comes back, and seven raw fields fill the column, from title to can edit. The request line reads ready. A second call, PATCH offer slash 7, appears and a pause packet leaves for the backend. The view model is still empty and the view still lists four decisions. The metrics show 7 backend fields, 0 UI fields and 4 decisions of logic in the view.',
      startState: { logic },
      frames: [
        { at: 300, set: { request: 'loading', calls: ['GET /offers/7'] } },
        { at: 500, packet: { lane: 'backend', dir: 'back', label: 'GET offer', tone: 'req' } },
        { at: 1500, packet: { lane: 'backend', label: 'payload', tone: 'res' } },
        { at: 2400, set: { request: 'ready', payload } },
        { at: 2900, set: { calls: ['GET /offers/7', 'PATCH /offers/7'] } },
        { at: 3100, packet: { lane: 'backend', dir: 'back', label: 'pause', tone: 'req' } },
      ],
    },
    {
      id: 'view-model',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'The view model translates',
      shortTitle: 'The view',
      body: [
        'The view model turns the backend shape into a screen shape: a price as text, a status as a label, the time left in words, and the actions this person may take. It drops what the screen does not need, here the owner and the region.',
        'Seven backend fields become five screen fields, and the four decisions leave the view one by one. A backend rename now touches this layer only.',
      ],
      keyIdea: 'One place turns backend fields into labels, status and allowed actions.',
      code: {
        language: 'ts',
        source:
          'const toOfferModel = (o: OfferPayload) => ({\n  price: formatPrice(o.price_cents),\n  status: statusLabel(o.status_code),\n  actions: allowedActions(o, role),\n});',
      },
      takeawayIndex: 3,
      sceneAlt:
        'The container holds its seven raw fields. A payload packet travels to the view model, which then builds its fields one at a time: title, price, status, expiry and actions, each with a note saying which backend field it comes from, and a line saying owner id and region were left out. As each field appears, a decision disappears from the view, until the view lists none. The metrics end at 7 backend fields, 5 UI fields and 0 decisions of logic in the view.',
      startState: { ...held(), logic },
      frames: [
        { at: 300, packet: { lane: 'pass', label: 'payload', tone: 'res' } },
        ...[1, 2, 3, 4, 5].map((n) => ({
          at: 1300 + (n - 1) * 500,
          set: { mapped: n, logic: logicAfter(n) },
        })),
      ],
    },
    {
      id: 'view',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'The view only draws',
      shortTitle: 'Why it pays',
      body: [
        'The view takes the model and a state, loading, error or ready, and draws exactly that. It reads no backend field and makes no decision, so a designer can change it without reading the rules.',
        'Loading and failure are part of the model, not a surprise: the view has a picture for each, and the container is the one that knows which applies.',
      ],
      keyIdea: 'A view that gets a finished model has nothing to decide, only something to draw.',
      code: {
        language: 'tsx',
        source:
          "function OfferView({ state, offer }: Props) {\n  if (state === 'loading') return <Skeleton />;\n  if (state === 'error') return <Retry />;\n  return <OfferCard {...offer} />;\n}",
      },
      takeawayIndex: 4,
      sceneAlt:
        'The container and the view model are full, and the view lists no decisions. Then the container refetches: the request line reads loading and the view draws grey placeholder bars with the word loading. A UI model packet travels to the view, the request line reads ready, and the view draws the offer: Spring sale, 19 dollars 99, an active label, 3 days left, and buttons Edit and Pause. Then the request line reads failed and the view shows could not load with a Try again button. The metrics stay at 7 backend fields, 5 UI fields and 0 decisions of logic in the view.',
      startState: { ...held(), mapped: MAPPED, logic: [], view: 'blank' },
      frames: [
        { at: 300, set: { request: 'loading', view: 'loading' } },
        { at: 1300, packet: { lane: 'show', label: 'UI model', tone: 'res' } },
        { at: 2200, set: { request: 'ready', view: 'ready' } },
        { at: 3600, set: { request: 'error', view: 'error' } },
      ],
    },
    {
      id: 'why-it-pays',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Why it pays, and when it does not',
      shortTitle: '',
      body: [
        'The mapping is now a plain function: test it with a few payloads and no screen. A backend rename has one place to go, and a permission rule has one home instead of a copy in every component.',
        'The layers cost files and names. A custom Hook, a function whose name starts with `use` and that can call other Hooks, can hold the container and the view model together, and each component that calls it gets its own state. For a small read-only widget that is enough, and a throwaway prototype can stay one component. Add the third layer when several views share a model, or when the rules need tests of their own.',
      ],
      keyIdea:
        'Split by the reason to change, and stop at the layer you can name a second reason for.',
      takeawayIndex: 5,
      sceneAlt:
        'A table replaces the diagram. Fetching the offer belongs to the container; turning cents into a price label, and deciding which buttons show, belong to the view model; drawing the loading and error states belongs to the view. A small read-only widget needs only a hook, and a throwaway prototype can stay one component.',
      startState: {
        ...held(),
        mapped: MAPPED,
        logic: [],
        view: 'ready',
      },
      frames: [],
      summary: {
        title: 'WHICH LAYER DOES IT?',
        rows: [
          { label: 'Fetching the offer', verdict: 'Container', tone: 'ok' },
          { label: 'Turning cents into a price label', verdict: 'View model', tone: 'ok' },
          { label: 'Deciding which buttons show', verdict: 'View model', tone: 'ok' },
          { label: 'Drawing loading and error', verdict: 'View', tone: 'ok' },
          { label: 'A small read-only widget', verdict: 'A hook is enough', tone: 'warn' },
          { label: 'A throwaway prototype', verdict: 'One component', tone: 'warn' },
        ],
      },
    },
  ],
};
