import type {
  Hop,
  OwnershipState,
  PerItem,
  Station,
  StationMark,
} from '@/components/scenes/StateOwnershipScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 6, State Ownership (article sections 4 and 5). New in M5: the text is written for this
 * project from the outline in docs/SPEC.md. The scene is components/scenes/StateOwnershipScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * offers page, its items and the counts are illustrative; the diagram and step 1 say so.
 *
 * The items, in the order of every per-item array (also their place in the pile): offers, filter,
 * modal, theme, job, profile, draft, sort. The homes: 0 server, 1 client UI, 2 URL, 3 persistent,
 * 4 real-time.
 */

const SERVER = 0;
const CLIENT = 1;
const URL_ = 2;
const PERSISTENT = 3;
const REALTIME = 4;

const FILTER = 1;

const items: PerItem<string> = [
  'offers',
  'filter',
  'modal',
  'theme',
  'job',
  'profile',
  'draft',
  'sort',
];

/** Every item in its own home. */
const sorted: PerItem<number | null> = [
  SERVER,
  URL_,
  CLIENT,
  PERSISTENT,
  REALTIME,
  SERVER,
  CLIENT,
  URL_,
];
const unsorted: PerItem<number | null> = [null, null, null, null, null, null, null, null];

/** The order step 2 sorts the items in: home by home, so each home fills before the next. */
const sortOrder = [0, 5, 2, 6, 1, 7, 3, 4];
/** The homes after the first `n` items of `sortOrder` have moved. */
const sortedUpTo = (n: number) =>
  unsorted.map((_, i) => (sortOrder.indexOf(i) < n ? sorted[i]! : null)) as PerItem<number | null>;

const baseState: OwnershipState = {
  labels: {
    illustrative: 'illustrative page · simulated hops',
    store: 'ONE GLOBAL STORE',
    storeNote: 'NO SINGLE OWNER',
    storeEmpty: 'empty: every item has one home',
    bins: ['SERVER', 'CLIENT UI', 'URL', 'PERSISTENT', 'REAL-TIME'],
    empty: 'empty',
    guarantees: [
      ['cached, refetched', 'can go stale'],
      ['instant', 'fine to lose'],
      ['shareable link', 'Back button works'],
      ['outlives a reload', 'on this device'],
      ['arrives in order', 'resumes on drop'],
    ],
    tools: ['request cache', 'component', 'search params', 'storage', 'subscription'],
    path: 'UPDATE PATH',
    noUpdate: 'no update yet',
    done: 'REACHED',
    drift: 'OUT OF SYNC',
    dup: 'TWO OWNERS',
    back: 'copies back',
    kindsOf: '{n} of {total}',
    hops: '{n} hops',
    none: '—',
  },
  items,
  home: unsorted,
  hot: null,
  noted: 0,
  tooled: 0,
  stations: [],
  trail: [],
};

const station = (role: string, value: string, mark: StationMark = 'idle'): Station => ({
  role,
  value,
  mark,
});
const hop = (from: number, to: number): Hop => ({ from, to });

export const stateOwnership: Lesson<OwnershipState> = {
  slug: 'state-ownership',
  order: 6,
  track: 'Data and state',
  title: 'State Ownership',
  summary: 'Sort state into five kinds, give each a home, and let updates travel one way.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [4, 5],
  takeaways: [
    'One store for everything gives every value the same rules and no single owner',
    'Sort state into five kinds: server, client UI, URL, persistent and real-time',
    'Name the guarantees a kind needs, then pick the tool that keeps them',
    'Let an update travel one way: action, handler, owner, then the screen',
    'Give every value one owner, and compute what you can derive',
  ],
  metricLabels: ['State kinds', 'Unowned items', 'Update path length'],
  sceneId: 'state-ownership',
  baseState,
  steps: [
    {
      id: 'one-store',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'Everything in one global store',
      shortTitle: 'Five kinds of state',
      body: [
        'An offers page keeps all of its state in one global store: the offers from the server, the open modal, the draft, the filter, the theme and an export job. Any component may write any of it, so no value has a single owner.',
        'The filter also lives in the URL, and effects copy it both ways. One click takes four hops, one of them backwards, and the copies disagree until the copy lands. The page, its items and the counts are illustrative.',
      ],
      keyIdea: 'When one store holds everything, nothing has a single owner, and copies drift.',
      code: {
        language: 'tsx',
        source:
          '// one store for every kind of state\nconst app = { offers, modal, draft, filter, theme };\n// the filter also lives in the URL, synced both ways\nuseEffect(() => writeUrl({ filter }), [filter]);\nuseEffect(() => setFilter(readUrl().filter), [url]);',
      },
      takeawayIndex: 0,
      sceneAlt:
        'At the top, one global store holds eight items: offers, filter, modal, theme, job, profile, draft and sort, and says no single owner. Below it, five homes labelled server, client UI, URL, persistent and real-time are all empty. At the bottom, an update path with four stations: action, store, URL and UI. A click sets the filter in the store, which then reads out of sync with the URL; an effect copies it to the URL, another copies it back to the store, and the list renders from the URL. The store and the URL are both marked two owners, and a red arrow under them says copies back. The metrics show 0 of 5 state kinds, 8 unowned items and 4 hops.',
      startState: {
        stations: [
          station('ACTION', 'click: new'),
          station('STORE', 'filter: all'),
          station('URL', '?filter=all'),
          station('UI', 'list: all'),
        ],
      },
      frames: [
        { at: 300, packet: { lane: 'fwd0', label: 'setFilter', tone: 'req' } },
        {
          at: 1200,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('STORE', 'filter: new', 'drift'),
              station('URL', '?filter=all', 'drift'),
              station('UI', 'list: all'),
            ],
            trail: [hop(0, 1)],
          },
        },
        { at: 1500, packet: { lane: 'fwd1', label: 'sync URL', tone: 'req' } },
        {
          at: 2400,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('STORE', 'filter: new', 'dup'),
              station('URL', '?filter=new', 'dup'),
              station('UI', 'list: all'),
            ],
            trail: [hop(0, 1), hop(1, 2)],
          },
        },
        { at: 2700, packet: { lane: 'back1', dir: 'back', label: 'sync back', tone: 'bad' } },
        { at: 3600, set: { trail: [hop(0, 1), hop(1, 2), hop(2, 1)] } },
        { at: 3900, packet: { lane: 'fwd2', label: 'render', tone: 'res' } },
        {
          at: 4800,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('STORE', 'filter: new', 'dup'),
              station('URL', '?filter=new', 'dup'),
              station('UI', 'list: new', 'done'),
            ],
            trail: [hop(0, 1), hop(1, 2), hop(2, 1), hop(2, 3)],
          },
        },
      ],
    },
    {
      id: 'five-homes',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Five kinds, five homes',
      shortTitle: 'What each home promises',
      body: [
        'Sort each item by where its truth lives. Offers and the profile come from the server; the modal and the draft belong to the screen; the filter and sort order to the URL; the theme to this device; the export job to a live feed.',
        'Each item now sits in exactly one home, and the global store is empty. A total you can compute from the offers is not a ninth item: derive it when you render.',
      ],
      keyIdea: "Ask where a value's truth lives, and give it that one home.",
      code: {
        language: 'ts',
        source:
          "const homeOf = {\n  offers: 'server', profile: 'server',\n  modal: 'client-ui', draft: 'client-ui',\n  filter: 'url', sort: 'url',\n  theme: 'persistent', job: 'real-time',\n} as const;",
      },
      takeawayIndex: 1,
      sceneAlt:
        'The eight items leave the global store one by one: offers and profile go to the server home, modal and draft to client UI, filter and sort to URL, theme to persistent, and job to real-time. Each home is outlined once it holds something, and the store ends empty, saying every item has one home. No update has run. The metrics end at 5 of 5 state kinds and 0 unowned items.',
      frames: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
        at: n * 400,
        set: { home: sortedUpTo(n) },
      })),
    },
    {
      id: 'guarantees',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Each home keeps a different promise',
      shortTitle: 'Choose the tool last',
      body: [
        'Server data needs caching, refetching and a rule for when it is stale. Client UI state must feel instant and is fine to lose. URL state has to survive a shared link and the Back button.',
        'Persistent state must outlive a reload on this device. Real-time state must arrive in order and pick up again after the connection drops. No single store keeps all five promises at once.',
      ],
      keyIdea: 'Different kinds need different guarantees, so they need different homes.',
      takeawayIndex: 2,
      sceneAlt:
        'Every item sits in its home. One home after another, a promise appears under its items: server, cached, refetched, can go stale; client UI, instant, fine to lose; URL, shareable link, Back button works; persistent, outlives a reload, on this device; real-time, arrives in order, resumes on drop. The metrics show 5 of 5 state kinds and 0 unowned items.',
      startState: { home: sorted },
      frames: [1, 2, 3, 4, 5].map((n) => ({ at: n * 500, set: { noted: n } })),
    },
    {
      id: 'tool-last',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Choose the tool last',
      shortTitle: 'One direction',
      body: [
        'Once the kind is known, the tool follows: a request cache for server data, component state for flags and drafts, search params for the URL, device storage for preferences, and a subscription for live updates.',
        'Starting from a favourite tool tends to pull every kind into it. Starting from the kind keeps each tool small and its rules plain.',
      ],
      keyIdea: 'Category first, tool second.',
      code: {
        language: 'tsx',
        source:
          "const offers = useCachedRequest('/offers'); // server\nconst [open, setOpen] = useState(false); // client UI\nconst filter = useSearchParam('filter'); // URL\nconst theme = useStored('theme'); // persistent\nuseLiveEvent('job-done', refetchOffers); // real-time",
      },
      takeawayIndex: 2,
      sceneAlt:
        'Every item sits in its home with its promise. One home after another, a tool appears at the bottom: request cache for server, component for client UI, search params for URL, storage for persistent, and subscription for real-time. The metrics show 5 of 5 state kinds and 0 unowned items.',
      startState: { home: sorted, noted: 5 },
      frames: [1, 2, 3, 4, 5].map((n) => ({ at: n * 500, set: { tooled: n } })),
    },
    {
      id: 'one-way',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Let updates travel one way',
      shortTitle: 'Where does it live?',
      body: [
        'A click becomes an action, a handler decides what it means, the owner of that state changes, and the screen renders from the owner. Nothing writes back up the path.',
        "Picking the new filter now takes three hops and ends in the URL, the filter's only owner. The list reads it from there, so there is no copy to keep in step.",
      ],
      keyIdea: 'Action, handler, owner, screen: one direction, and one owner per value.',
      code: {
        language: 'tsx',
        source:
          "function onFilter(value: string) { // handler\n  setSearchParam('filter', value); // owner: the URL\n}\nconst filter = useSearchParam('filter'); // screen\n<FilterTabs value={filter} onChange={onFilter} />",
      },
      takeawayIndex: 3,
      sceneAlt:
        'Every item sits in its home with its promise and tool. The update path has four stations: action, handler, owner URL and UI. A click goes to the handler, the handler sets the filter in the URL, whose chip now reads filter: new, and the list renders from the URL. Every arrow runs forward above the stations and each station is marked reached. The metrics show 5 of 5 state kinds, 0 unowned items and 3 hops.',
      startState: {
        home: sorted,
        noted: 5,
        tooled: 5,
        stations: [
          station('ACTION', 'click: new'),
          station('HANDLER', 'onFilter'),
          station('OWNER: URL', '?filter=all'),
          station('UI', 'list: all'),
        ],
      },
      frames: [
        { at: 300, packet: { lane: 'fwd0', label: 'click', tone: 'req' } },
        {
          at: 1200,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('HANDLER', 'onFilter', 'done'),
              station('OWNER: URL', '?filter=all'),
              station('UI', 'list: all'),
            ],
            trail: [hop(0, 1)],
          },
        },
        { at: 1500, packet: { lane: 'fwd1', label: 'setParam', tone: 'req' } },
        {
          at: 2400,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('HANDLER', 'onFilter', 'done'),
              station('OWNER: URL', '?filter=new', 'done'),
              station('UI', 'list: all'),
            ],
            trail: [hop(0, 1), hop(1, 2)],
            items: items.map((name, i) => (i === FILTER ? 'filter: new' : name)) as PerItem<string>,
            hot: FILTER,
          },
        },
        { at: 2700, packet: { lane: 'fwd2', label: 'render', tone: 'res' } },
        {
          at: 3600,
          set: {
            stations: [
              station('ACTION', 'click: new', 'done'),
              station('HANDLER', 'onFilter', 'done'),
              station('OWNER: URL', '?filter=new', 'done'),
              station('UI', 'list: new', 'done'),
            ],
            trail: [hop(0, 1), hop(1, 2), hop(2, 3)],
          },
        },
      ],
    },
    {
      id: 'where-it-lives',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Where does it live?',
      shortTitle: '',
      body: [
        'When a new piece of state appears, ask two questions before writing code: where is its truth, and what must it survive? The answers name the kind, and the kind names the home.',
        'If a value can be computed from state you already hold, it needs no home at all.',
      ],
      keyIdea: 'Find the kind first. The home and the tool follow from it.',
      takeawayIndex: 4,
      sceneAlt:
        'A table replaces the diagram. A filter on a search page lives in the URL; whether a modal is open, in client UI state; a list of offers from the API, in the server cache; the chosen theme, in persistent storage; a background job that just finished, as a real-time event, then a refetch; and a total computed from the list is derived, with no home.',
      startState: { home: sorted, noted: 5, tooled: 5 },
      frames: [],
      summary: {
        title: 'WHERE DOES IT LIVE?',
        rows: [
          { label: 'A filter on a search page', verdict: 'The URL', tone: 'ok' },
          { label: 'Whether a modal is open', verdict: 'Client UI state', tone: 'ok' },
          { label: 'A list of offers from the API', verdict: 'Server cache', tone: 'ok' },
          { label: 'The chosen colour theme', verdict: 'Persistent storage', tone: 'ok' },
          {
            label: 'A background job that just finished',
            verdict: 'Event, then refetch',
            tone: 'warn',
          },
          { label: 'A total computed from the list', verdict: 'Derive it, no home', tone: 'warn' },
        ],
      },
    },
  ],
};
