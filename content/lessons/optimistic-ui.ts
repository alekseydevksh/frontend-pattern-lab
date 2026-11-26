import type { OptimisticUiState } from '@/components/scenes/OptimisticUiScene';
import type { Lesson, Metric } from '@/engine/types';

/**
 * Lesson 1, Optimistic UI (article section 7). Ported from the first lesson of
 * reference/prototype.html: the wording, the order of the steps and the timing of the frames
 * are the prototype's. The scene is components/scenes/OptimisticUiScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only.
 */

const metric = (value: string, tone?: Metric['tone']): Metric =>
  tone ? { value, tone } : { value };
const none = { text: '', kind: 'none' } as const;
const dashes: OptimisticUiState['metrics'] = [metric('—'), metric('—'), metric('—')];

const baseState: OptimisticUiState = {
  labels: {
    browser: 'BROWSER',
    server: 'SERVER',
    database: 'DATABASE',
    lane: 'HTTP',
    axis: 'TIME →',
    snapshot: 'snapshot liked=false · 128',
    uiChanges: 'UI changes',
    serverAnswers: 'Server answers',
    marker: '{label} · {ms} ms',
  },
  title: 'Post by Alex',
  button: 'Like',
  buttonOn: false,
  buttonPending: false,
  value: '128',
  status: none,
  snapshot: false,
  toast: '',
  serverKey: 'likes',
  serverValue: '128',
  serverNote: none,
  uiAt: null,
  serverAt: null,
  metrics: dashes,
};

/** The screen changes at once and the request leaves in the background (steps 2 to 4). */
const likedAtOnce = {
  button: 'Liked',
  buttonOn: true,
  value: '129',
  status: { text: 'Saving in background…', kind: 'wait' },
  uiAt: 0,
  metrics: [metric('0 ms'), metric('—'), metric('—')],
} satisfies Partial<OptimisticUiState>;

const toast = 'Could not like. Try again.';

export const optimisticUi: Lesson<OptimisticUiState> = {
  slug: 'optimistic-ui',
  order: 1,
  track: 'Data and state',
  title: 'Optimistic UI',
  summary:
    'Update the screen first, confirm with the server second, and undo cleanly when the server says no.',
  minutes: 4,
  level: 'Intermediate',
  sourceSections: [7],
  takeaways: [
    'Why waiting for the server makes small actions feel slow',
    'How to update first and send the request in the background',
    'What a rollback needs: a snapshot and a visible error',
    'Which actions should never be optimistic',
  ],
  metricLabels: ['UI changes at', 'Server answers at', 'Rollback'],
  sceneId: 'optimistic-ui',
  baseState,
  steps: [
    {
      id: 'waiting',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'Waiting makes a tap feel broken',
      shortTitle: 'Update first',
      body: [
        'Tap Like. The request leaves, the server writes the change, the answer comes back, and only then does the button change.',
        'On a fast connection that is a blink. On a train it is a visible pause, and people tap twice. Here the round trip is a simulated 600 ms.',
      ],
      keyIdea: 'The user pays the full latency before seeing any result.',
      takeawayIndex: 0,
      sceneAlt:
        'A browser panel with a Like button and a count of 128 on the left, a server panel on the right and an HTTP lane between them. The button turns dashed and waits while a POST request travels to the server; only when the 200 answer comes back does it change to Liked with 129. The time strip marks both moments at 600 ms.',
      frames: [
        {
          at: 300,
          set: { buttonPending: true, status: { text: 'Waiting for server…', kind: 'wait' } },
          packet: { lane: 'main', label: 'POST /like', tone: 'req' },
        },
        {
          at: 1200,
          set: {
            serverValue: '129',
            serverNote: { text: 'saved', kind: 'ok' },
            serverAt: 600,
          },
          packet: { lane: 'main', dir: 'back', label: '200 OK', tone: 'res' },
        },
        {
          at: 2100,
          set: {
            buttonPending: false,
            button: 'Liked',
            buttonOn: true,
            value: '129',
            status: { text: 'Saved', kind: 'ok' },
            uiAt: 600,
            metrics: [metric('600 ms'), metric('600 ms'), metric('—')],
          },
        },
      ],
    },
    {
      id: 'update-first',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Update first, ask later',
      shortTitle: 'Server can say no',
      body: [
        'Change the cache in the same moment as the click. The button fills, the count goes up, and the request leaves in the background.',
        'The server answers no faster than before, but the user no longer waits for it.',
      ],
      keyIdea: 'The screen answers in 0 ms and the network catches up.',
      code: {
        language: 'ts',
        source:
          'onLike() {\n  cache.set(post.id, withLike(post)); // screen changes now\n  api.like(post.id);                  // network catches up\n}',
      },
      takeawayIndex: 1,
      sceneAlt:
        'The Like button turns to Liked and the count goes to 129 at once, while the POST request is still travelling to the server. The time strip marks the screen change at 0 ms and the server answer 600 ms later, and the status line moves from saving in the background to saved.',
      frames: [
        {
          at: 300,
          set: likedAtOnce,
          packet: { lane: 'main', label: 'POST /like', tone: 'req' },
        },
        {
          at: 1200,
          set: {
            serverValue: '129',
            serverNote: { text: 'saved', kind: 'ok' },
            serverAt: 600,
            metrics: [metric('0 ms'), metric('600 ms'), metric('no')],
          },
          packet: { lane: 'main', dir: 'back', label: '200 OK', tone: 'res' },
        },
        { at: 2100, set: { status: { text: 'Saved', kind: 'ok' } } },
      ],
    },
    {
      id: 'server-says-no',
      tag: 'FAILURE',
      tone: 'bad',
      title: 'The server can still say no',
      shortTitle: 'Keep a snapshot',
      body: [
        'A permission check, a deleted post or a dropped connection can reject the request after the screen has already changed.',
        'If nothing undoes the change, the UI shows something that never happened.',
      ],
      keyIdea: 'Optimism is a bet. Pay it back when you lose.',
      takeawayIndex: 2,
      sceneAlt:
        'The button shows Liked at once, then the server answers 403 and rejects the change. The button goes back to Like, the count returns to 128, the status says Failed. Rolled back, and a red toast reads Could not like. Try again.',
      frames: [
        {
          at: 300,
          set: likedAtOnce,
          packet: { lane: 'main', label: 'POST /like', tone: 'req' },
        },
        {
          at: 1200,
          set: { serverNote: { text: 'rejected · 403', kind: 'bad' }, serverAt: 600 },
          packet: { lane: 'main', dir: 'back', label: '403', tone: 'bad' },
        },
        {
          at: 2100,
          set: {
            button: 'Like',
            buttonOn: false,
            value: '128',
            status: { text: 'Failed. Rolled back.', kind: 'bad' },
            toast,
            metrics: [metric('0 ms'), metric('600 ms'), metric('yes', 'bad')],
          },
        },
      ],
    },
    {
      id: 'snapshot',
      tag: 'IMPLEMENTATION',
      tone: 'ev',
      title: 'Keep a snapshot for the way back',
      shortTitle: 'Where it does not belong',
      body: [
        'Before you change the cache, hold on to the value you are replacing. A failed request restores it exactly.',
        'Pair the rollback with a message that says what went wrong and how to retry.',
      ],
      keyIdea: 'Snapshot, update, then confirm or restore.',
      code: {
        language: 'ts',
        source:
          'const previous = cache.get(id);\ncache.set(id, { ...previous, liked: true, likes: previous.likes + 1 });\ntry { await api.like(id); }\ncatch { cache.set(id, previous); toast("Could not like. Try again."); }',
      },
      takeawayIndex: 2,
      sceneAlt:
        'The same failed like, now with a dashed snapshot strip under the post card that holds the old value, liked false and 128. After the 403 the card is restored from that snapshot, the status says so, and the error toast appears.',
      startState: { snapshot: true },
      frames: [
        {
          at: 300,
          set: likedAtOnce,
          packet: { lane: 'main', label: 'POST /like', tone: 'req' },
        },
        {
          at: 1200,
          set: { serverNote: { text: 'rejected · 403', kind: 'bad' }, serverAt: 600 },
          packet: { lane: 'main', dir: 'back', label: '403', tone: 'bad' },
        },
        {
          at: 2100,
          set: {
            button: 'Like',
            buttonOn: false,
            value: '128',
            status: { text: 'Restored from snapshot', kind: 'bad' },
            toast,
            metrics: [metric('0 ms'), metric('600 ms'), metric('yes', 'bad')],
          },
        },
      ],
    },
    {
      id: 'not-every-action',
      tag: 'LIMIT',
      tone: 'req',
      title: 'Not every action can bet',
      shortTitle: 'A quick test',
      body: [
        'Signing a contract, moving money or deleting data carries legal or financial weight. Showing “Signed” before the server agrees is a promise you may not keep.',
        'Use a pending state instead: show “Signing…”, wait for confirmation, then show the result.',
      ],
      keyIdea: 'If a rollback would be awkward or costly, show pending, not success.',
      takeawayIndex: 3,
      sceneAlt:
        'A contract card with a Sign button and the value Unsigned. The button stays dashed and reads Signing… until the server confirms; only then does it show Signed and Done, and the server records the status as signed.',
      startState: {
        title: 'Contract #2041',
        button: 'Sign',
        value: 'Unsigned',
        serverKey: 'status',
        serverValue: 'unsigned',
      },
      frames: [
        {
          at: 300,
          set: { buttonPending: true, status: { text: 'Signing…', kind: 'wait' } },
          packet: { lane: 'main', label: 'POST /sign', tone: 'req' },
        },
        {
          at: 1200,
          set: {
            serverValue: 'signed',
            serverNote: { text: 'signature stored', kind: 'ok' },
            serverAt: 600,
          },
          packet: { lane: 'main', dir: 'back', label: '200 OK', tone: 'res' },
        },
        {
          at: 2100,
          set: {
            buttonPending: false,
            button: 'Signed',
            buttonOn: true,
            value: 'Done',
            status: { text: 'Confirmed by server', kind: 'ok' },
            uiAt: 600,
            metrics: [metric('600 ms'), metric('600 ms'), metric('n/a')],
          },
        },
      ],
    },
    {
      id: 'quick-test',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'A quick test',
      shortTitle: '',
      body: [
        'Go optimistic when the action almost always succeeds, undoing it is simple, the user expects instant feedback and the risk is low.',
        'Take extra care when several people can edit the same record: a clean rollback can turn into a conflict.',
      ],
      keyIdea: 'Optimistic UI is a consistency strategy, not only a speed trick.',
      takeawayIndex: 3,
      sceneAlt:
        'A table replaces the diagram. Liking a post, saving an item and marking a notification as read are marked optimistic; signing a document and sending a payment are marked pending state.',
      frames: [],
      summary: {
        title: 'IS IT SAFE TO UPDATE FIRST?',
        rows: [
          { label: 'Like a post', verdict: 'Optimistic', tone: 'ok' },
          { label: 'Save an item', verdict: 'Optimistic', tone: 'ok' },
          { label: 'Mark a notification as read', verdict: 'Optimistic', tone: 'ok' },
          { label: 'Sign a document', verdict: 'Pending state', tone: 'warn' },
          { label: 'Send a payment', verdict: 'Pending state', tone: 'warn' },
        ],
      },
    },
  ],
};
