import type {
  BracketNote,
  ContextBox,
  IsolationState,
  PerNode,
  RenderMark,
} from '@/components/scenes/RenderingIsolationScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 5, Rendering Isolation (article section 13). New in M5: the text is written for this
 * project from the outline in docs/SPEC.md. The scene is components/scenes/RenderingIsolationScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * component tree, its counts and the costs are illustrative or simulated; the diagram and step 1
 * say so.
 *
 * The components, in the order of every per-component array: App, Header, Form, Input, Send,
 * Thread, Messages.
 */

const I: RenderMark = 'idle';
const U: RenderMark = 'used';
const W: RenderMark = 'wasted';
const S: RenderMark = 'skipped';

const nothing: PerNode<RenderMark> = [I, I, I, I, I, I, I];
const zero: PerNode<number> = [0, 0, 0, 0, 0, 0, 0];

const APP = 0;
const COMPOSER = 2;
const THREAD = 5;

const baseState: IsolationState = {
  labels: {
    illustrative: 'illustrative tree · simulated costs',
    tree: 'COMPONENT TREE',
    nodes: ['App', 'Header', 'Form', 'Input', 'Send', 'Thread', 'Messages'],
    count: '×{n}',
    used: 'RENDERED',
    wasted: 'WASTED',
    skipped: 'SKIPPED',
    owns: 'state: {name}',
    change: 'CHANGE',
    noChange: 'nothing changed yet',
    context: 'CONTEXT',
    readBy: 'read by {names}',
    memo: 'memo',
    contain: 'contain',
    renderedOf: '{n} of {total}',
    none: '—',
  },
  renders: zero,
  marks: nothing,
  owner: APP,
  stateName: 'draft',
  change: null,
  contexts: [],
  contextHome: null,
  memo: 'off',
  contained: false,
  notes: [],
};

const draft = (text: string) => ({ text: `draft: "${text}"`, tone: 'req' as const });
const event = (text: string) => ({ text, tone: 'ev' as const });

/** Step 1: what the draft's real readers are, and what renders for nothing. */
const draftNotes: BracketNote[] = [
  { from: 1, to: 2, title: 'NEEDS THE DRAFT', note: 'Input and Send show it', tone: 'req' },
  { from: 3, to: 3, title: 'NEVER READS IT', note: 'renders on every key', tone: 'bad' },
];
const headerNote: BracketNote = {
  from: 0,
  to: 0,
  title: 'NEEDS UNREAD',
  note: 'its only real reader',
  tone: 'req',
};

const oneContext: ContextBox[] = [
  { name: 'Global', keys: 'user · unread', readers: 'Header, Form, Messages' },
];
const splitContexts: ContextBox[] = [
  { name: 'User', keys: 'user', readers: 'Form, Messages' },
  { name: 'Inbox', keys: 'unread', readers: 'Header' },
];

const memoNote = (note: string, tone: BracketNote['tone']): BracketNote[] => [
  { from: 3, to: 3, title: 'MEMO', note, tone },
];

export const renderingIsolation: Lesson<IsolationState> = {
  slug: 'rendering-isolation',
  order: 5,
  track: 'Rendering and performance',
  title: 'Rendering Isolation',
  summary: 'Stop a small change from re-rendering a whole tree by deciding where state lives.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [13],
  takeaways: [
    'A state change renders its owner and everything below it, needed or not',
    'Keep state in the lowest component that every reader sits under',
    'Split a context by responsibility, so a reader renders only for what it reads',
    'Memoize costly parts with stable props, and shrink the renders you cannot avoid',
    'Splitting code into files organizes it; only isolation cuts the work at run time',
  ],
  metricLabels: ['Rendered per change', 'Wasted renders', 'Where the state lives'],
  sceneId: 'rendering-isolation',
  baseState,
  steps: [
    {
      id: 'whole-tree',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'One key press, the whole tree',
      shortTitle: 'Move the state down',
      body: [
        'The message draft lives in `App`, at the top of the screen. Every key press sets it, and React renders the component that owns the state and every component below it.',
        'Only the field and the send button have anything new to show. The header, the thread and its messages draw the same picture again. The tree, its counts and its costs here are illustrative.',
      ],
      keyIdea: 'A state change renders its owner and everything below it, needed or not.',
      code: {
        language: 'tsx',
        source:
          "// in App, though only Form reads the draft\nconst [draft, setDraft] = useState('');\n<Header />\n<Form draft={draft} onDraftChange={setDraft} />\n<Thread />",
      },
      takeawayIndex: 0,
      sceneAlt:
        'A component tree drawn from left to right: App, with Header, Form and Thread below it, Input and Send under Form, and Messages under Thread. App holds the draft state. Twice, an onChange packet travels from Input to Form and on to App, and the change card shows the draft as "h", then "hi". Each time all seven components render: App, Input and Send are marked rendered, and Header, Form, Thread and Messages are marked wasted. Every box counts 2 renders, and the metrics show 7 of 7 rendered, 4 wasted, with the state in App.',
      frames: [
        {
          at: 300,
          set: { change: draft('h') },
          packet: { lane: 'toForm', label: 'onChange', tone: 'req' },
        },
        { at: 1000, packet: { lane: 'toApp', label: 'onChange', tone: 'req' } },
        {
          at: 1900,
          set: { marks: [U, W, W, U, U, W, W], renders: [1, 1, 1, 1, 1, 1, 1], notes: draftNotes },
        },
        {
          at: 2300,
          set: { change: draft('hi') },
          packet: { lane: 'toForm', label: 'onChange', tone: 'req' },
        },
        { at: 3000, packet: { lane: 'toApp', label: 'onChange', tone: 'req' } },
        { at: 3900, set: { renders: [2, 2, 2, 2, 2, 2, 2] } },
      ],
    },
    {
      id: 'state-down',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Keep state next to its readers',
      shortTitle: 'Split the context',
      body: [
        'Ask which components read the draft: only the field and the button, and both sit inside `Form`. Move the state there, and the rest of the tree never hears about a key press.',
        'Nothing is memoized and nothing new is installed. The state simply lives in the lowest component that covers everyone who reads it.',
      ],
      keyIdea: 'Put state in the lowest component that every reader sits under.',
      code: {
        language: 'tsx',
        source:
          "// in Form, moved down from App\nconst [draft, setDraft] = useState('');\n<Input value={draft} onChange={setDraft} />\n<Send disabled={draft === ''} />",
      },
      takeawayIndex: 1,
      sceneAlt:
        'The same tree. The state tag moves from App to Form, and a bracket marks Form and its children as the place the state lives. Twice, an onChange packet travels from Input to Form, and the draft becomes "h", then "hi". Only Form, Input and Send render, each counting 2. App, Header, Thread and Messages stay at zero. The metrics show 3 of 7 rendered, none wasted, with the state in Form.',
      frames: [
        {
          at: 600,
          set: {
            owner: COMPOSER,
            notes: [
              {
                from: 1,
                to: 2,
                title: 'STATE LIVES HERE',
                note: 'Form and below',
                tone: 'res',
              },
            ],
          },
        },
        {
          at: 1200,
          set: { change: draft('h') },
          packet: { lane: 'toForm', label: 'onChange', tone: 'req' },
        },
        { at: 2100, set: { marks: [I, I, U, U, U, I, I], renders: [0, 0, 1, 1, 1, 0, 0] } },
        {
          at: 2500,
          set: { change: draft('hi') },
          packet: { lane: 'toForm', label: 'onChange', tone: 'req' },
        },
        { at: 3400, set: { renders: [0, 0, 2, 2, 2, 0, 0] } },
      ],
    },
    {
      id: 'split-context',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Split a context by responsibility',
      shortTitle: 'Memoize on purpose',
      body: [
        'Some values really are shared, so they go in a context. One context that holds both the user and the unread count renders every reader when either changes, and each reader renders its children too.',
        'Give each responsibility a context of its own. A component then subscribes only to what it reads, and a new unread count reaches the header alone.',
      ],
      keyIdea: 'A context change renders every reader. Group values by who reads them.',
      code: {
        language: 'tsx',
        source:
          '// before: any change renders every reader\nconst GlobalContext = createContext({ user, unread });\n// after: each reader subscribes to what it reads\nconst UserContext = createContext(user);\nconst InboxContext = createContext(unread);',
      },
      takeawayIndex: 2,
      sceneAlt:
        'The tree with a context card below it: a Global context holds the user and the unread count and is read by Header, Form and Messages. The unread count goes from 3 to 4. Header renders and is marked rendered, while Form, Input, Send and Messages are marked wasted. The card then splits into a User context, read by Form and Messages, and an Inbox context, read by Header. The count goes from 4 to 5 and only Header renders. The metrics end at 1 of 7 rendered, none wasted, with the state in the Inbox context.',
      startState: {
        owner: null,
        stateName: 'unread',
        contexts: oneContext,
        contextHome: 0,
      },
      frames: [
        { at: 300, set: { change: event('unread: 3 → 4') } },
        {
          at: 900,
          set: {
            marks: [I, U, W, W, W, I, W],
            renders: [0, 1, 1, 1, 1, 0, 1],
            notes: [
              headerNote,
              { from: 1, to: 3, title: 'READ USER ONLY', note: 'render for unread', tone: 'bad' },
            ],
          },
        },
        {
          at: 1800,
          set: { contexts: splitContexts, contextHome: 1, marks: nothing, notes: [headerNote] },
        },
        { at: 2400, set: { change: event('unread: 4 → 5') } },
        { at: 3000, set: { marks: [I, U, I, I, I, I, I], renders: [0, 2, 1, 1, 1, 0, 1] } },
      ],
    },
    {
      id: 'memo-on-purpose',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Memoize on purpose',
      shortTitle: 'Shrink a needed render',
      body: [
        'When state has to stay high, wrap the costly subtree in `memo`, which skips a render when the props are equal. A function or object made fresh on every render is never equal, so the wrapper compares and renders anyway.',
        'Keep props stable, keep selectors returning the same value for the same input, and spend memo only where a render is expensive. A cheap component is quicker to render than to compare.',
      ],
      keyIdea: 'Memo pays off only with stable props, around parts that cost something.',
      code: {
        language: 'tsx',
        source:
          'const Thread = memo(ThreadView); // the costly part\n// leaky: a new function on every render\n<Thread onReply={(t) => send(t)} />\n// stable: the same function, so memo can skip\nconst onReply = useCallback((t) => send(t), [send]);',
      },
      takeawayIndex: 3,
      sceneAlt:
        'App holds the online state, which Header and Form read. A dashed memo boundary surrounds Thread and Messages, and its note says onReply is new each time. The connection drops and all seven components render; Thread and Messages are marked wasted. The note then says onReply is kept stable. The connection returns: App, Header, Form, Input and Send render, while Thread and Messages are marked skipped. The metrics end at 5 of 7 rendered, none wasted, with the state in App.',
      startState: {
        stateName: 'online',
        memo: 'leaky',
        notes: memoNote('onReply new each time', 'bad'),
      },
      frames: [
        { at: 300, set: { change: event('online: yes → no') } },
        { at: 900, set: { marks: [U, U, U, U, U, W, W], renders: [1, 1, 1, 1, 1, 1, 1] } },
        {
          at: 1800,
          set: { memo: 'stable', marks: nothing, notes: memoNote('onReply kept stable', 'res') },
        },
        { at: 2400, set: { change: event('online: no → yes') } },
        { at: 3000, set: { marks: [U, U, U, U, U, S, S], renders: [2, 2, 2, 2, 2, 1, 1] } },
      ],
    },
    {
      id: 'contain-heavy',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Shrink the renders you need',
      shortTitle: 'Separation or isolation',
      body: [
        'Some renders are needed: a new message arrives and the thread has to show it. Isolation then means making that render small. Draw only the rows in view, as in the virtualization lesson, and let CSS containment keep layout work inside the section.',
        'The state already lives in `Thread`, so nothing else renders. What changes is how much work that one render does.',
      ],
      keyIdea: 'When a render is needed, shrink it: a window of rows in a contained box.',
      code: {
        language: 'tsx',
        source:
          "<section style={{ contain: 'content' }}>\n  {messages.slice(start, start + 20).map((m) => (\n    <Message key={m.id} message={m} />\n  ))}\n</section>",
      },
      takeawayIndex: 3,
      sceneAlt:
        'Thread holds the messages state, and Thread and Messages have rendered once for message 2,001. A bracket marks Messages as a heavy section: 2,000 rows at about 90 ms. A dashed contain boundary then appears around Messages and the bracket reads contained, 20 of 2,000 rows. Message 2,002 arrives; Thread and Messages render a second time, and the bracket reads 20 rows at about 4 ms. The metrics stay at 2 of 7 rendered, none wasted, with the state in Thread.',
      startState: {
        owner: THREAD,
        stateName: 'messages',
        change: event('messages: 2,001'),
        marks: [I, I, I, I, I, U, U],
        renders: [0, 0, 0, 0, 0, 1, 1],
        notes: [
          { from: 3, to: 3, title: 'HEAVY SECTION', note: '2,000 rows · ~90 ms', tone: 'bad' },
        ],
      },
      frames: [
        {
          at: 600,
          set: {
            contained: true,
            marks: nothing,
            notes: [{ from: 3, to: 3, title: 'CONTAINED', note: '20 of 2,000 rows', tone: 'res' }],
          },
        },
        { at: 1400, set: { change: event('messages: 2,002') } },
        {
          at: 1700,
          set: {
            marks: [I, I, I, I, I, U, U],
            renders: [0, 0, 0, 0, 0, 2, 2],
            notes: [{ from: 3, to: 3, title: 'CONTAINED', note: '20 rows · ~4 ms', tone: 'res' }],
          },
        },
      ],
    },
    {
      id: 'separation-or-isolation',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Separation is not isolation',
      shortTitle: '',
      body: [
        'Splitting code into files, folders and components organizes it for the people who read it. It does not change what renders when state changes: that depends on where the state lives and who subscribes to it.',
        'Find the components that render for nothing, then reach for the lightest fix first: move state, split a context, and only then memoize or contain.',
      ],
      keyIdea: 'Separation organizes the code. Isolation limits the work at run time.',
      takeawayIndex: 4,
      sceneAlt:
        'A table replaces the diagram. A field only its own form reads is marked move state down; unrelated values in one context, split the context; a costly subtree with stable props, memoize it; a cheap component that renders often, leave it alone; thousands of rows that must update, window and contain; and components split into more files, no runtime effect.',
      frames: [],
      summary: {
        title: 'WHAT STOPS THIS RE-RENDER?',
        rows: [
          { label: 'A field only its own form reads', verdict: 'Move state down', tone: 'ok' },
          { label: 'Unrelated values in one context', verdict: 'Split the context', tone: 'ok' },
          { label: 'A costly subtree with stable props', verdict: 'Memoize it', tone: 'warn' },
          { label: 'A cheap component that renders often', verdict: 'Leave it alone', tone: 'ok' },
          {
            label: 'Thousands of rows that must update',
            verdict: 'Window and contain',
            tone: 'warn',
          },
          {
            label: 'Components split into more files',
            verdict: 'No runtime effect',
            tone: 'warn',
          },
        ],
      },
    },
  ],
};
