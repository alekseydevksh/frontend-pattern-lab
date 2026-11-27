import type {
  Aside,
  Band,
  Part,
  Requirement,
  RequirementsState,
} from '@/components/scenes/RequirementsScene';
import type { Lesson } from '@/engine/types';

/**
 * Lesson 7, Requirements First and Component Boundaries (article sections 1 and 2). New in M5: the
 * text is written for this project from the outline in docs/SPEC.md and the rules in
 * docs/EDITORIAL.md. The scene is components/scenes/RequirementsScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * offers screen, its requirements and its parts are illustrative; the diagram and step 1 say so.
 */

const FUNCTIONAL = 0;
const QUALITY = 1;

const need = (
  kind: Requirement['kind'],
  text: string,
  owner: string | null = null,
  mark: Requirement['mark'] = 'idle',
): Requirement => ({ kind, text, owner, mark });
const part = (name: string, edit = false): Part => ({ name, edit });
const band = (title: string, role: string, ...parts: Part[]): Band => ({ title, role, parts });

/** The six requirements of the offers screen, in order, and who owns each in a given structure. */
const offers = (owners: Array<string | null>): Requirement[] =>
  [
    [FUNCTIONAL, 'List the offers'],
    [FUNCTIONAL, 'Filter by status'],
    [FUNCTIONAL, 'Create an offer'],
    [QUALITY, 'Works by keyboard alone'],
    [QUALITY, 'Readable on a phone'],
    [QUALITY, 'List appears quickly'],
  ].map(([kind, text], i) => need(kind as Requirement['kind'], text as string, owners[i] ?? null));

/** The seventh requirement, which arrives in steps 4 and 5. */
const paused = (owner: string | null, mark: Requirement['mark'] = 'new') =>
  need(FUNCTIONAL, 'Offers can be paused', owner, mark);

const nobody = offers([null, null, null, null, null, null]);
/** The offers screen on a page and some primitives only: three requirements fit no part. */
const crowded = offers(['OffersPage', null, null, 'Button', 'OffersPage', null]);
/** Split by looks: four requirements have no clear owner, and the page owns the rest. */
const byLooks = offers([null, null, null, null, 'OffersPage', 'OffersPage']);
/** Split by responsibility: every requirement has one owner. */
const byResponsibility = offers([
  'OfferList',
  'OfferList',
  'CreateOfferForm',
  'Button',
  'OffersPage',
  'OfferList',
]);

const staticPage: Requirement[] = [
  need(FUNCTIONAL, 'Show the opening hours', 'HoursPage'),
  need(QUALITY, 'Readable on a phone', 'HoursPage'),
  need(QUALITY, 'Loads quickly', 'HoursPage'),
];

const staticBands = [
  band('PAGE', 'one part owns it all', part('HoursPage')),
  band('PRIMITIVES', 'small shared pieces', part('Heading'), part('Link')),
];
const crowdedBands = [
  band('PAGE', 'wires one route together', part('OffersPage')),
  band('PRIMITIVES', 'knows nothing about offers', part('Button'), part('TextField')),
];
const looksBands = (edit: boolean) => [
  band('PAGE', 'fetches, filters, decides, draws', part('OffersPage', edit)),
  band(
    'BY LOOKS',
    'named for where they sit',
    part('Header', edit),
    part('Sidebar', edit),
    part('CardGrid', edit),
  ),
];
const layeredBands = (edited: string | null) => [
  band('PAGE', 'wires one route together', part('OffersPage')),
  band('FEATURE', 'does one job for the user', part('OfferList'), part('CreateOfferForm')),
  band(
    'DOMAIN',
    "knows the product's words",
    part('OfferCard'),
    part('StatusBadge', edited === 'StatusBadge'),
  ),
  band('PRIMITIVES', 'knows nothing about offers', part('Button'), part('TextField')),
];

const blocks: Record<'none' | 'functional' | 'quality', Aside> = {
  none: {
    title: 'NO STRUCTURE YET',
    lines: ['Six requirements, no component drawn.', 'The tools come after the questions.'],
    tone: 'muted',
  },
  functional: {
    title: 'FUNCTIONAL · WHAT IT DOES',
    lines: ['Each one asks for a part that does it:', 'a list, a filter, a form.'],
    tone: 'req',
  },
  quality: {
    title: 'NON-FUNCTIONAL · HOW WELL',
    lines: ['Each one binds every part at once:', 'keyboard use, a phone, speed.'],
    tone: 'ev',
  },
};

const baseState: RequirementsState = {
  labels: {
    illustrative: 'illustrative screen, requirements and parts',
    requirements: 'REQUIREMENTS',
    kinds: ['FUNCTIONAL', 'NON-FUNCTIONAL'],
    noRequirements: 'no requirements yet',
    owner: 'owner: {name}',
    noOwner: 'no clear owner',
    isNew: 'NEW',
    edit: 'EDIT',
  },
  cards: [],
  heading: 'STRUCTURE',
  aside: [blocks.none],
  bands: [],
  note: '',
  noteTone: 'muted',
};

export const requirementsFirst: Lesson<RequirementsState> = {
  slug: 'requirements-first',
  order: 7,
  track: 'Structure',
  title: 'Requirements First and Component Boundaries',
  summary:
    'Start from what the product must do and survive, then draw component layers around responsibilities.',
  minutes: 5,
  level: 'Beginner',
  sourceSections: [1, 2],
  takeaways: [
    'Start from the requirements, and choose tools after them',
    'Features ask for parts; qualities set rules that every part must follow',
    'A static page needs little structure; a data-heavy app needs more',
    'Boundaries drawn by looks leave a page that owns everything, and a change reaches every part',
    'Boundaries drawn by responsibility keep a change inside one part',
    'Ask the same ownership questions of every component, and keep a small screen flat',
  ],
  metricLabels: ['Needs', 'Layers', 'Unclear owners'],
  sceneId: 'requirements-first',
  baseState,
  steps: [
    {
      id: 'requirements-first',
      tag: 'START',
      tone: 'req',
      title: 'Start from the requirements',
      shortTitle: 'Two kinds of requirement',
      body: [
        'Before you choose a tool or name a component, write down what the screen must do and how well it must do it. This offers screen starts with six requirements. The screen, its requirements and its parts are illustrative.',
        'None of them has an owner yet, and that is the point: a component drawn before the requirements is a guess about who will need it.',
      ],
      keyIdea: 'Questions first, tools second.',
      takeawayIndex: 0,
      sceneAlt:
        'On the left, six requirement cards appear one after another: list the offers, filter by status, create an offer, works by keyboard alone, readable on a phone and list appears quickly. Each says no clear owner. On the right, a dashed box reads no structure yet: six requirements, no component drawn, and the tools come after the questions. The metrics end at 6 needs, 0 layers and 6 unclear owners.',
      frames: nobody.map((_, i) => ({
        at: 300 + i * 600,
        set: { cards: nobody.slice(0, i + 1) },
      })),
    },
    {
      id: 'two-kinds',
      tag: 'CONCEPT',
      tone: 'ev',
      title: 'Two kinds of requirement',
      shortTitle: 'A page and an app',
      body: [
        'Functional requirements say what the screen does: list the offers, filter them, create one. Each asks for a part that does that job.',
        'Non-functional requirements say how well it does it: usable by keyboard alone, readable on a phone, quick to show the list. A quality like that binds every part at once, so it needs a deliberate home, not an accident.',
      ],
      keyIdea: 'Features ask for parts. Qualities set rules that every part must follow.',
      takeawayIndex: 1,
      sceneAlt:
        'The six requirement cards stay on the left, each with the word functional or non-functional. On the right, the no structure box is replaced by two text blocks. The functional block says each one asks for a part that does it: a list, a filter, a form. The non-functional block says each one binds every part at once: keyboard use, a phone, speed. The metrics stay at 6 needs, 0 layers and 6 unclear owners.',
      startState: { cards: nobody },
      frames: [
        { at: 400, set: { aside: [blocks.functional] } },
        { at: 1400, set: { aside: [blocks.functional, blocks.quality] } },
      ],
    },
    {
      id: 'page-and-app',
      tag: 'PRESSURE',
      tone: 'req',
      title: 'A page and an app feel different pressure',
      shortTitle: 'Boundaries drawn by looks',
      body: [
        'A page with opening hours has three requirements, and one part can own them all: two layers are plenty. The offers screen has six, with a list, a filter, a form and a speed target, and the same two layers leave three of them without a clear owner.',
        'More data and more states mean more places for a decision to go missing. How much structure a screen needs follows from what it must survive, not from a template.',
      ],
      keyIdea:
        'The more a screen has to do and survive, the more structure it needs. A static page needs little.',
      takeawayIndex: 2,
      sceneAlt:
        'At first the left shows three requirements of a static opening-hours page, all owned by HoursPage, and the right shows two layers, a page and primitives. The metrics read 3 needs, 2 layers and 0 unclear owners. Then the six offers requirements replace them on a similar two-layer structure with an offers page, a button and a text field. Filter by status, create an offer and the quick list now say no clear owner, and a note reads 3 requirements have no clear owner. The metrics end at 6 needs, 2 layers and 3 unclear owners.',
      startState: { cards: staticPage, bands: staticBands, aside: [] },
      frames: [
        {
          at: 1400,
          set: {
            cards: crowded,
            bands: crowdedBands,
            note: '3 requirements have no clear owner',
            noteTone: 'bad',
          },
        },
      ],
    },
    {
      id: 'split-by-looks',
      tag: 'FAILURE',
      tone: 'bad',
      title: 'Boundaries drawn by looks',
      shortTitle: 'Boundaries drawn by responsibility',
      body: [
        'Draw the boundaries by what the screen looks like and you get a Header, a Sidebar and a CardGrid, with a page behind them that still fetches, filters, decides and draws. Four of the six requirements have no clear owner.',
        "Then a requirement changes: offers can be paused. A new status shows in the header's count, the sidebar's filter, the grid's cards and the page's logic, so all four parts need an edit. The boundaries follow the picture, not the change.",
      ],
      keyIdea:
        'A boundary drawn by looks cannot hold a change in, because a change cuts across the picture.',
      takeawayIndex: 3,
      sceneAlt:
        'The structure is split by looks: a page that fetches, filters, decides and draws, and three screen pieces called Header, Sidebar and CardGrid. Four of the six requirement cards say no clear owner, and two belong to the offers page. A seventh card, offers can be paused, arrives marked new with no clear owner, and a change packet travels to the structure. All four parts are then marked edit, and the note reads 4 of 4 parts to edit. The metrics end at 7 needs, 2 layers and 5 unclear owners.',
      startState: {
        cards: byLooks,
        heading: 'SPLIT BY LOOKS',
        aside: [],
        bands: looksBands(false),
      },
      frames: [
        { at: 300, set: { cards: [...byLooks, paused(null)] } },
        { at: 800, packet: { lane: 'change', label: 'change', tone: 'req' } },
        {
          at: 1700,
          set: { bands: looksBands(true), note: '4 of 4 parts to edit', noteTone: 'bad' },
        },
      ],
    },
    {
      id: 'split-by-responsibility',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Boundaries drawn by responsibility',
      shortTitle: 'Which layer owns it?',
      body: [
        "Split by responsibility instead. Primitives know nothing about offers. The domain layer knows the product's words. A feature does one job for the user, and the page wires a route together. Each requirement now has one owner.",
        'The same new status lands in one place: the domain layer holds the status list and its labels, and the list and the filter read them from there. One part of seven is edited, and every boundary stays where it was.',
      ],
      keyIdea:
        'Draw the boundary around what changes together, and a change stays on one side of it.',
      code: {
        language: 'ts',
        source:
          "// a layer imports from layers below it:\n// page → feature → domain → primitives\nimport { OfferCard } from '../domain/OfferCard';\nimport { Button } from '../primitives/Button';",
      },
      takeawayIndex: 4,
      sceneAlt:
        'The structure is now split by responsibility into four layers: a page, features with OfferList and CreateOfferForm, a domain layer with OfferCard and StatusBadge, and primitives with Button and TextField. Every requirement card names one owner. The seventh card, offers can be paused, arrives marked new and owned by StatusBadge, and a change packet travels to the structure. Only StatusBadge is marked edit, and the note reads 1 of 7 parts to edit. The metrics end at 7 needs, 4 layers and 0 unclear owners.',
      startState: {
        cards: byResponsibility,
        heading: 'SPLIT BY RESPONSIBILITY',
        aside: [],
        bands: layeredBands(null),
      },
      frames: [
        { at: 300, set: { cards: [...byResponsibility, paused('StatusBadge')] } },
        { at: 800, packet: { lane: 'change', label: 'change', tone: 'req' } },
        {
          at: 1700,
          set: {
            bands: layeredBands('StatusBadge'),
            note: '1 of 7 parts to edit',
            noteTone: 'good',
          },
        },
      ],
    },
    {
      id: 'which-layer',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Which layer owns it?',
      shortTitle: '',
      body: [
        "Ask the same questions of every component: does it know the product's words, does it fetch or hold state, who else uses it, and what makes it change? The answers place it in a layer.",
        'Layers cost files, names and indirection. Pay for them when several screens, people or kinds of change share the code. A landing page with no data, or a throwaway tool, is better kept flat.',
      ],
      keyIdea: 'Ask who owns it, and add a layer only where something needs an owner.',
      takeawayIndex: 5,
      sceneAlt:
        'A table replaces the diagram. A button is a primitive; an offer card is a domain component; a create-offer form is a feature component; and the offers screen is a page. A landing page with no data should be kept flat, and a throwaway internal tool needs only a page and primitives.',
      startState: {
        cards: [...byResponsibility, paused('StatusBadge', 'idle')],
        heading: 'SPLIT BY RESPONSIBILITY',
        aside: [],
        bands: layeredBands(null),
      },
      frames: [],
      summary: {
        title: 'WHICH LAYER OWNS IT?',
        rows: [
          { label: 'A button', verdict: 'Primitive', tone: 'ok' },
          { label: 'An offer card', verdict: 'Domain component', tone: 'ok' },
          { label: 'A create-offer form', verdict: 'Feature component', tone: 'ok' },
          { label: 'The offers screen', verdict: 'Page', tone: 'ok' },
          { label: 'A landing page with no data', verdict: 'Keep it flat', tone: 'warn' },
          { label: 'A throwaway internal tool', verdict: 'Page and primitives', tone: 'warn' },
        ],
      },
    },
  ],
};
