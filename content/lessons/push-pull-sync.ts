import type { PushPullState } from '@/components/scenes/PushPullScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 2, Push + Pull Sync (article section 6). Ported from the second lesson of
 * reference/prototype.html: the wording, the order of the steps and the timing of the frames
 * are the prototype's. The scene is components/scenes/PushPullScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only.
 */

const baseState: PushPullState = {
  labels: {
    browser: 'BROWSER',
    server: 'SERVER',
    documents: 'Documents',
    sourceOfTruth: 'Source of truth',
    push: 'PUSH',
    websocket: 'WEBSOCKET',
    pull: 'PULL',
    http: 'HTTP',
    pending: 'pending',
    signed: 'signed',
    refreshing: 'refreshing',
    unknown: '···',
    socket: 'socket {status}',
    open: 'open',
    down: 'down',
    event: '↳ event: {event}',
    inSync: 'in sync',
    stale: 'stale',
    none: '—',
  },
  docs: ['Lease.pdf', 'NDA.pdf', 'Invoice 77'],
  ui: ['pending', 'pending', 'signed'],
  srv: ['pending', 'pending', 'signed'],
  badge: 2,
  toast: '',
  socket: 'open',
  refetch: -1,
  loaded: true,
  event: null,
};

/** The NDA is signed on the server. The browser has not heard yet (steps 3 to 5). */
const ndaSigned: PushPullState['srv'] = ['pending', 'signed', 'signed'];

export const pushPullSync: Lesson<PushPullState> = {
  slug: 'push-pull-sync',
  order: 2,
  status: 'published',
  track: 'Data and state',
  title: 'Push + Pull Sync',
  summary: 'Load with requests, stay fresh with events, and recover when the connection drops.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [6],
  takeaways: [
    'Pull gives a complete snapshot you can trust',
    'Push says something changed, not what is true now',
    'Each event needs a rule: refetch, toast, badge or ignore',
    'A refetch on reconnect closes the gap left by missed events',
  ],
  metricLabels: ['Client vs server', 'Socket', 'Pending badge'],
  sceneId: 'push-pull-sync',
  baseState,
  steps: [
    {
      id: 'load-with-a-request',
      tag: 'PULL',
      tone: 'res',
      title: 'Load with a request',
      shortTitle: 'Something changes',
      body: [
        'The first screen comes from ordinary requests. The response is the full picture at that moment, which makes it a safe starting point.',
      ],
      keyIdea: 'Pull is complete and consistent, but only at the moment you ask.',
      takeawayIndex: 0,
      sceneAlt:
        'A browser panel with an empty Documents list on the left and a server panel holding three documents on the right. A GET request travels along the pull lane to the server and a 200 answer with three documents comes back, after which the list fills in and the badge shows 2. The push lane stays quiet.',
      startState: { ui: [null, null, null], badge: null, loaded: false },
      frames: [
        { at: 300, packet: { lane: 'pull', label: 'GET /documents', tone: 'req' } },
        {
          at: 1200,
          packet: { lane: 'pull', dir: 'back', label: '200 · 3 documents', tone: 'res' },
        },
        { at: 2000, set: { ui: ['pending', 'pending', 'signed'], badge: 2, loaded: true } },
      ],
    },
    {
      id: 'something-changes',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'Then something changes',
      shortTitle: 'Push',
      body: [
        'While you read the list, a colleague signs the NDA. The server knows. Your tab does not, because nobody asked.',
        'Without another request, the screen keeps showing “pending” for as long as it stays open.',
      ],
      keyIdea: 'A request and response client cannot hear about changes it did not ask for.',
      takeawayIndex: 1,
      sceneAlt:
        'The server now lists the NDA as signed, but the browser still shows it as pending, outlined with a dashed red border to mark it as stale. Nothing travels on either lane, and the client-versus-server metric reads stale.',
      frames: [{ at: 500, set: { srv: ndaSigned } }],
    },
    {
      id: 'server-speaks-up',
      tag: 'PUSH',
      tone: 'ev',
      title: 'Let the server speak up',
      shortTitle: 'Give events a rule',
      body: [
        'Keep a WebSocket or Server-Sent Events stream open. When the NDA is signed, the server sends one small event that names what changed.',
      ],
      keyIdea: 'Push says something changed. It does not have to carry the whole truth.',
      code: {
        language: 'json',
        source: '{ "type": "DOCUMENT_SIGNED",\n  "payload": { "id": "nda" } }',
      },
      takeawayIndex: 1,
      sceneAlt:
        'A DOCUMENT_SIGNED packet travels along the push lane from the server to the browser. Once it arrives, a note under the list names the event the browser heard. The NDA row still says pending.',
      startState: { srv: ndaSigned },
      frames: [
        { at: 300, packet: { lane: 'push', label: 'DOCUMENT_SIGNED', tone: 'ev' } },
        { at: 1200, set: { event: 'DOCUMENT_SIGNED' } },
      ],
    },
    {
      id: 'event-rules',
      tag: 'RULES',
      tone: 'req',
      title: 'Give every event a rule',
      shortTitle: 'Confirm with a request',
      body: [
        'An event is a trigger, so decide what it does: refresh the affected query, show a toast, adjust the badge, or ignore it when the user is somewhere else.',
        'Write the rule per event type, and check that handling the same event twice is harmless.',
      ],
      keyIdea: 'Each event type gets its own small, explicit reaction.',
      code: {
        language: 'ts',
        source:
          'socket.on("DOCUMENT_SIGNED", ({ id }) => {\n  invalidate(["document", id]);  // refetch the row\n  toast("NDA.pdf was signed");\n  badge.pending -= 1;\n});',
      },
      takeawayIndex: 2,
      sceneAlt:
        'The browser has heard DOCUMENT_SIGNED and reacts three ways at once: a red toast reads NDA.pdf was signed, the pending badge drops from 2 to 1, and the NDA row switches to refreshing.',
      startState: { srv: ndaSigned, event: 'DOCUMENT_SIGNED' },
      frames: [{ at: 400, set: { toast: 'NDA.pdf was signed', badge: 1, refetch: 1 } }],
    },
    {
      id: 'confirm-with-a-request',
      tag: 'PULL',
      tone: 'res',
      title: 'Confirm with a request',
      shortTitle: 'When the socket drops',
      body: [
        'The event only triggers the refresh. The response from the server decides what the row finally shows.',
        'That keeps the backend as the source of truth while the UI still reacts within moments.',
      ],
      keyIdea: 'The event starts the refresh; the response settles it.',
      takeawayIndex: 2,
      sceneAlt:
        'A GET request for the NDA goes along the pull lane and the answer comes back saying it is signed. The NDA row in the browser then changes from refreshing to signed, the toast goes away, and the browser matches the server.',
      startState: {
        srv: ndaSigned,
        event: 'DOCUMENT_SIGNED',
        toast: 'NDA.pdf was signed',
        badge: 1,
        refetch: 1,
      },
      frames: [
        { at: 300, packet: { lane: 'pull', label: 'GET /documents/nda', tone: 'req' } },
        {
          at: 1200,
          packet: { lane: 'pull', dir: 'back', label: '200 · nda: signed', tone: 'res' },
        },
        { at: 2000, set: { ui: ['pending', 'signed', 'signed'], refetch: -1, toast: '' } },
      ],
    },
    {
      id: 'socket-drops',
      tag: 'RECOVERY',
      tone: 'req',
      title: 'When the socket drops',
      shortTitle: 'Which one does the job',
      body: [
        'Mobile networks sleep, laptops close and proxies time out. Any event sent while the socket is down is gone for good.',
        'On reconnect, treat everything as possibly stale: refetch the live queries instead of trying to replay history.',
      ],
      keyIdea: 'Events can be missed. A refetch on reconnect closes the gap.',
      takeawayIndex: 3,
      sceneAlt:
        'The socket light turns red and reads socket down. A DOCUMENT_SIGNED packet starts along the push lane and fades halfway, lost, so the browser never hears it and the Lease row goes stale. When the socket opens again, a GET request and its answer travel the pull lane, every row ends up signed and the badge reads 0.',
      startState: {
        ui: ['pending', 'signed', 'signed'],
        srv: ndaSigned,
        badge: 1,
      },
      frames: [
        { at: 300, set: { socket: 'down' } },
        {
          at: 1000,
          set: { srv: ['signed', 'signed', 'signed'] },
          packet: { lane: 'push', lost: true, label: 'DOCUMENT_SIGNED', tone: 'bad' },
        },
        { at: 2300, set: { socket: 'open' } },
        { at: 2700, packet: { lane: 'pull', label: 'GET /documents', tone: 'req' } },
        {
          at: 3600,
          packet: { lane: 'pull', dir: 'back', label: '200 · 3 documents', tone: 'res' },
        },
        { at: 4400, set: { ui: ['signed', 'signed', 'signed'], badge: 0 } },
      ],
    },
    {
      id: 'which-one',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Which one does the job',
      shortTitle: '',
      body: [
        'Use push for freshness and pull for correctness. Before shipping an event, ask whether it is idempotent, what happens if it arrives before the first load, and how missed ones are recovered.',
      ],
      keyIdea: 'The backend stays the source of truth; the frontend stays responsive.',
      takeawayIndex: 3,
      sceneAlt:
        'A table replaces the diagram. A first screen load, a socket reconnect and the question of what is true right now are answered by pull; something that changed on the server is answered by push.',
      startState: {
        ui: ['signed', 'signed', 'signed'],
        srv: ['signed', 'signed', 'signed'],
        badge: 0,
      },
      frames: [],
      summary: {
        title: 'WHICH ONE DOES THE JOB?',
        rows: [
          { label: 'First screen load', verdict: 'Pull', tone: 'ok' },
          { label: 'Something changed on the server', verdict: 'Push', tone: 'warn' },
          { label: 'Socket reconnected', verdict: 'Pull', tone: 'ok' },
          { label: 'What is true right now?', verdict: 'Pull', tone: 'ok' },
        ],
      },
    },
  ],
};
