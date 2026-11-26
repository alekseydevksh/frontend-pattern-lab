import type { NormalizedState } from '@/components/scenes/NormalizedDataScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 4, Normalized Data (article section 9). New in M5: the text is written for this project
 * from the outline in docs/SPEC.md. The scene is components/scenes/NormalizedDataScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * user, the id and the names are made up, and the diagram says so; step 1 says so too.
 */

const OLD = 'Mira Lund';
const NEW = 'Mira Vale';

const baseState: NormalizedState = {
  labels: {
    illustrative: 'illustrative data',
    response: 'RESPONSE',
    store: 'STORE',
    screen: 'SCREEN',
    update: 'UPDATE',
    plan: 'CACHE PLAN',
    byResponse: 'per response',
    byId: 'by id',
    paths: ['feed[0].author', 'profile.user', 'comments[0].author'],
    copy: 'COPY {n}',
    idLine: 'id: {id}',
    nameLine: 'name: {name}',
    reference: '→ {id}',
    by: 'by {name}',
    views: ['FEED', 'PROFILE', 'COMMENTS'],
    stale: 'STALE',
    users: 'USERS',
    references: '{n} references',
    noRecord: 'NO SHARED RECORD',
    noRecordNote: 'each view reads its own copy',
    noUpdate: 'no update yet',
    updateTitle: 'user {id} renamed',
    plans: ['Same id, same record', 'Merge every response', 'Refetch what drifts'],
    syncOf: '{n} of {total}',
    none: '—',
  },
  userId: 'u1',
  fetched: OLD,
  mode: 'copies',
  names: [null, null, null],
  entity: null,
  view: [null, null, null],
  latest: OLD,
  sent: false,
  flag: false,
  plan: 0,
};

/** Everything loaded, one copy of the user for each response (steps 2 and 3). */
const copiesLoaded = {
  names: [OLD, OLD, OLD],
  view: [OLD, OLD, OLD],
} satisfies Partial<NormalizedState>;

/** Everything loaded, one record by id and three references (steps 4 to 6). */
const normalized = {
  mode: 'entities',
  entity: OLD,
  view: [OLD, OLD, OLD],
} satisfies Partial<NormalizedState>;

export const normalizedData: Lesson<NormalizedState> = {
  slug: 'normalized-data',
  order: 4,
  track: 'Data and state',
  title: 'Normalized Data',
  summary: 'Store each thing once, by id, so one change reaches every screen that shows it.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [9],
  takeaways: [
    'A nested response repeats one entity under every parent that mentions it',
    'Copies of one fact drift apart: a change reaches some places and misses others',
    'Store each entity once, by id, and let other records hold only the id',
    'A query library still needs your plan for identity and cache updates',
  ],
  metricLabels: ['Copies of the user', 'Views in sync', 'Writes needed'],
  sceneId: 'normalized-data',
  baseState,
  steps: [
    {
      id: 'repeated-user',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'The same user, copied everywhere',
      shortTitle: 'A rename',
      body: [
        'A feed, a profile page and a comment thread each come back as a nested response, and each carries its author inside. One person appears three times, once under every parent that mentions them.',
        'Kept as they arrive, those are three separate copies, and every screen reads its own. Nothing says they describe one person. The user, the id and the names in this diagram are illustrative.',
      ],
      keyIdea: 'A nested response repeats an entity under every parent that mentions it.',
      takeawayIndex: 0,
      sceneAlt:
        'Three panels side by side. On the left, a response holds a feed post, a profile and a comment, and each carries the same author: id u1, name Mira Lund. Three answers travel one after another into the store in the middle, which keeps a separate copy of the user for each. On the right, the feed, the profile and the comments each show Mira Lund. The three response cards turn teal to mark the repeated author, and the metrics count 3 copies of the user.',
      frames: [
        { at: 300, packet: { lane: 'load0', label: 'feed', tone: 'res' } },
        { at: 700, packet: { lane: 'load1', label: 'profile', tone: 'res' } },
        { at: 1100, packet: { lane: 'load2', label: 'comments', tone: 'res' } },
        { at: 1200, set: { names: [OLD, null, null], view: [OLD, null, null] } },
        { at: 1600, set: { names: [OLD, OLD, null], view: [OLD, OLD, null] } },
        { at: 2000, set: { names: [OLD, OLD, OLD], view: [OLD, OLD, OLD] } },
        { at: 2600, set: { flag: true } },
      ],
    },
    {
      id: 'stale-copies',
      tag: 'FAILURE',
      tone: 'bad',
      title: 'A rename reaches only one copy',
      shortTitle: 'Store each user once',
      body: [
        'The server renames the user. The code that handles the news knows about the feed, so it patches the author there and stops. The profile and the comment thread keep the old name.',
        'Nothing throws and nothing is logged: three screens now disagree about one person. Every new place that shows the user is one more spot to remember.',
      ],
      keyIdea: 'Copies of one fact drift apart the moment one of them changes.',
      code: {
        language: 'ts',
        source:
          "cache.feed[0].author.name = 'Mira Vale';\n// cache.profile.user.name is still 'Mira Lund'\n// cache.comments[0].author.name is still 'Mira Lund'",
      },
      takeawayIndex: 1,
      sceneAlt:
        'The same three copies, all reading Mira Lund. An update card at the bottom left announces that user u1 is now Mira Vale, and a rename packet travels into the store. Only the first copy changes to Mira Vale. The other two copies and the profile and comment views keep the old name and are marked STALE in red. The metrics show 3 copies, 1 of 3 views in sync and 2 writes still needed.',
      startState: { ...copiesLoaded, flag: true },
      frames: [
        {
          at: 300,
          set: { latest: NEW, sent: true },
          packet: { lane: 'write', label: 'rename', tone: 'ev' },
        },
        {
          at: 1200,
          set: { names: [NEW, OLD, OLD] },
          packet: { lane: 'read0', label: 'name', tone: 'res' },
        },
        { at: 2100, set: { view: [NEW, OLD, OLD] } },
      ],
    },
    {
      id: 'store-by-id',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Store each entity once, by id',
      shortTitle: 'One write',
      body: [
        'Split a response at every object that has an identity. Each user, post and comment becomes one record in a table keyed by its id, and a parent keeps only the id of the records it mentions.',
        'The three copies collapse into one record, `u1`, and three small references. A screen that needs the name looks the user up by id.',
      ],
      keyIdea: 'An entity lives in one place. Everything else holds its id.',
      code: {
        language: 'json',
        source:
          '{\n  "users": { "u1": { "name": "Mira Lund" } },\n  "posts": { "p1": { "author": "u1" } },\n  "comments": { "c1": { "author": "u1" } }\n}',
      },
      takeawayIndex: 2,
      sceneAlt:
        'The three copies in the store fade out and three references take their place, each reading only the id u1. A USERS card appears below them with a single record, u1, Mira Lund, and lines join each reference to it. The metrics change from 3 copies of the user to 1, with all 3 views in sync.',
      startState: copiesLoaded,
      frames: [{ at: 600, set: { mode: 'entities', entity: OLD } }],
    },
    {
      id: 'one-write',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'One write updates every view',
      shortTitle: 'What a library leaves out',
      body: [
        'Now the same rename is a single write: set the name on `u1`. The feed, the profile and the thread all read that record, so each one shows the new name the next time it draws.',
        'There is no list of places to remember, and a new screen that shows the user adds nothing to it. The write is as small for ten views as for three.',
      ],
      keyIdea: 'One fact, one place: a change lands once and every reader follows.',
      code: {
        language: 'ts',
        source:
          "store.users.u1.name = 'Mira Vale';\n// every view that reads u1 now shows 'Mira Vale'",
      },
      takeawayIndex: 2,
      sceneAlt:
        'The store holds one user record and three references. The update card announces Mira Vale and a rename packet travels into the store. For a moment the record and the three views are marked STALE. Then the record changes to Mira Vale and three packets leave for the feed, the profile and the comments, which all show Mira Vale. The metrics end at 1 copy, 3 of 3 views in sync and no writes needed.',
      startState: normalized,
      frames: [
        {
          at: 300,
          set: { latest: NEW, sent: true },
          packet: { lane: 'write', label: 'rename', tone: 'ev' },
        },
        {
          at: 1200,
          set: { entity: NEW },
          packet: { lane: 'read0', label: 'name', tone: 'res' },
        },
        { at: 1200, packet: { lane: 'read1', label: 'name', tone: 'res' } },
        { at: 1200, packet: { lane: 'read2', label: 'name', tone: 'res' } },
        { at: 2100, set: { view: [NEW, NEW, NEW] } },
      ],
    },
    {
      id: 'library-plan',
      tag: 'CAVEAT',
      tone: 'ev',
      title: 'A query library still needs a plan',
      shortTitle: 'The test question',
      body: [
        'A data-fetching library caches what each request returned, under the key of that request. Two queries that both return the same user are still two copies, unless you decide what counts as the same entity and how to merge it.',
        'The plan has three parts: a stable id for every entity, a rule that merges each response and each mutation into the store, and a refetch for whatever you cannot patch.',
      ],
      keyIdea: 'A cache gives you storage. Identity and update rules are still your design.',
      code: {
        language: 'ts',
        source:
          'function mergeUser(store: Store, user: User) {\n  const known = store.users[user.id];\n  store.users[user.id] = { ...known, ...user };\n}',
      },
      takeawayIndex: 3,
      sceneAlt:
        'The normalized store as before, with one user record and three references. A CACHE PLAN panel appears at the bottom right, and its three chips light up one after another: same id, same record; merge every response; refetch what drifts.',
      startState: normalized,
      frames: [
        { at: 300, set: { plan: 1 } },
        { at: 900, set: { plan: 2 } },
        { at: 1500, set: { plan: 3 } },
      ],
    },
    {
      id: 'test-question',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Can it appear twice?',
      shortTitle: '',
      body: [
        'Ask one question of each kind of data: can the same entity show up in more than one place, on one screen or across several? If it can, give it an id and a single home.',
        'If a record is read in one place and never repeated, nesting is simpler, and a normalized store would add code for nothing.',
      ],
      keyIdea: 'Normalize what repeats. Leave alone what appears once.',
      takeawayIndex: 3,
      sceneAlt:
        'A table replaces the diagram. A feed where each post shows its author, people who appear in both a roster and a chat, and a product shown in a list and on its own page are marked normalize. A one-off report on a single page and a settings form read by one screen are marked keep nested.',
      startState: normalized,
      frames: [],
      summary: {
        title: 'SHOULD THIS DATA BE NORMALIZED?',
        rows: [
          { label: 'A feed where each post shows its author', verdict: 'Normalize', tone: 'warn' },
          { label: 'A one-off report on a single page', verdict: 'Keep nested', tone: 'ok' },
          { label: 'People in both a roster and a chat', verdict: 'Normalize', tone: 'warn' },
          { label: 'A settings form read by one screen', verdict: 'Keep nested', tone: 'ok' },
          { label: 'A product in a list and on its own page', verdict: 'Normalize', tone: 'warn' },
        ],
      },
    },
  ],
};
