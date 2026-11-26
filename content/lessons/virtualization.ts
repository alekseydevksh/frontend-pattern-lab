import type { VirtualizationState } from '@/components/scenes/VirtualizationScene';
import type { Lesson, Metric } from '@/engine/types';

/**
 * Lesson 3, Virtualization (article sections 10 and 11). New in M5: the text is written for this
 * project from the outline in docs/SPEC.md. The scene is components/scenes/VirtualizationScene.tsx.
 *
 * Every word the scene draws is in the state below, so a translation changes this file only. The
 * counts are illustrative and the render costs simulated; the diagram and step 1 say so.
 */

const cost = (value: string, tone?: Metric['tone']): Metric => (tone ? { value, tone } : { value });

const baseState: VirtualizationState = {
  labels: {
    locale: 'en',
    browser: 'BROWSER',
    illustrative: 'illustrative numbers',
    api: 'API',
    endpoint: '/items',
    apiNote: '{total} rows · {page} per page',
    sent: 'sent {rows}',
    fetch: 'FETCH',
    http: 'HTTP',
    dom: 'DOM',
    mountedRows: 'Rows mounted',
    ofTotal: 'of {total} rows',
    nodes: 'Nodes',
    perRow: 'about {n} per row',
    row: 'Row {n}',
    viewport: 'VIEWPORT',
    inView: '4 rows in view',
    offscreen: 'OFF-SCREEN',
    offscreenMounted: 'still mounted',
    offscreenSkipped: 'paint skipped',
    overscan: 'OVERSCAN',
    overscanNote: 'ready for a scroll',
    blockMounted: 'MOUNTED',
    blockSkipped: 'SKIPPED',
    spacer: 'SPACER',
    noSpacer: 'NO SPACER',
    blockRows: '{rows} rows',
    spacerSize: '{rows} rows · {px} px',
    noSpacerNote: '{rows} rows take no room',
    contain: 'content-visibility: auto',
    containNote: 'off-screen rows skip layout and paint',
    costs: ['Row heights', 'Focus', 'Find in page', 'Scroll restore'],
    none: '—',
  },
  total: 10_000,
  loaded: 10_000,
  pageSize: 50,
  first: 1199,
  mounted: 'all',
  spacers: false,
  contain: false,
  costs: 0,
  rowPx: 40,
  nodesPerRow: 6,
  nodeBudget: 1500,
  cost: cost('—'),
};

/** Every row mounted: the simulated cost of rendering all 10,000 (steps 1, 3 and 5). */
const allMountedCost = cost('900 ms', 'bad');
/** Only the window mounted (steps 3, 4, 6 and 7). */
const windowCost = cost('6 ms', 'good');
const windowed = {
  mounted: 'window',
  spacers: true,
  cost: windowCost,
} satisfies Partial<VirtualizationState>;

export const virtualization: Lesson<VirtualizationState> = {
  slug: 'virtualization',
  order: 3,
  track: 'Rendering and performance',
  title: 'Virtualization',
  summary:
    'Render only the rows a reader can see, and keep the scrollbar honest while the list stays long.',
  minutes: 5,
  level: 'Intermediate',
  sourceSections: [10, 11],
  takeaways: [
    'Rows nobody sees still cost DOM nodes, memory and render time',
    'Infinite scroll limits what is fetched, not what stays rendered',
    'A window, a small buffer and spacers keep the DOM small and the scrollbar true',
    'A window has real costs: measure, and try lighter tools first',
  ],
  metricLabels: ['Rows loaded', 'DOM nodes', 'Render cost'],
  sceneId: 'virtualization',
  baseState,
  steps: [
    {
      id: 'everything-mounted',
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'Thousands of rows, all in the DOM',
      shortTitle: 'Infinite scroll',
      body: [
        'The screen asks for every item and renders a row for each. Four rows fit in the viewport, yet the browser builds, lays out and paints ten thousand.',
        'Each row is a handful of DOM nodes, so the page holds tens of thousands. Memory climbs and every update has more to walk through. The counts here are illustrative and the render cost is simulated.',
      ],
      keyIdea: 'Rows nobody can see still cost layout, paint and memory.',
      takeawayIndex: 0,
      sceneAlt:
        'A browser panel with a list on the left, and an API panel and a DOM panel on the right. A GET request travels to the API and an answer with 10,000 rows comes back. Every row is then mounted: four rows inside the orange viewport frame, the rows around it marked off-screen but still mounted, and red blocks for 1,198 rows above and 8,794 below. The DOM panel counts 10,000 rows and 60,000 nodes.',
      startState: { loaded: 0 },
      frames: [
        { at: 300, packet: { lane: 'fetch', label: 'GET /items', tone: 'req' } },
        {
          at: 1200,
          packet: { lane: 'fetch', dir: 'back', label: '200 · 10,000 rows', tone: 'res' },
        },
        { at: 2000, set: { loaded: 10_000, cost: allMountedCost } },
      ],
    },
    {
      id: 'infinite-scroll',
      tag: 'LIMIT',
      tone: 'req',
      title: 'Infinite scroll pages the network, not the DOM',
      shortTitle: 'Render a window',
      body: [
        'Infinite scroll asks for the next page as the reader nears the end. The network stays calm: fifty rows at a time instead of ten thousand at once.',
        'Every page that arrives is added to the DOM and stays there. Scroll long enough and the page is back where the first step began.',
      ],
      keyIdea: 'Paging decides when to fetch. It does not decide how much stays rendered.',
      takeawayIndex: 1,
      sceneAlt:
        'The list starts with 50 fetched rows, all mounted, and the viewport near the end of them. Twice, a request for the next page travels to the API and 50 rows come back. Each time the list grows, the viewport moves to the new end, and the DOM panel count rises: from 50 to 150 rows and from 300 to 900 nodes. Nothing is ever removed.',
      startState: { loaded: 50, first: 39, cost: cost('5 ms') },
      frames: [
        { at: 300, packet: { lane: 'fetch', label: 'GET ?page=2', tone: 'req' } },
        { at: 1200, packet: { lane: 'fetch', dir: 'back', label: '200 · 50 rows', tone: 'res' } },
        { at: 2000, set: { loaded: 100, first: 89, cost: cost('9 ms') } },
        { at: 2400, packet: { lane: 'fetch', label: 'GET ?page=3', tone: 'req' } },
        { at: 3300, packet: { lane: 'fetch', dir: 'back', label: '200 · 50 rows', tone: 'res' } },
        { at: 4100, set: { loaded: 150, first: 139, cost: cost('14 ms') } },
      ],
    },
    {
      id: 'render-a-window',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Render only a window',
      shortTitle: 'Spacers',
      body: [
        'Mount the rows inside the viewport and a few on each side. That buffer, often called overscan, is already drawn when the reader scrolls, so no blank rows flash into view.',
        'As the list scrolls, the same few slots show new items. The DOM is as large for ten thousand rows as for a hundred.',
      ],
      keyIdea: 'Render work follows the size of the screen, not the length of the list.',
      code: {
        language: 'tsx',
        source:
          'const start = Math.max(0, Math.floor(scrollTop / ROW_PX) - OVERSCAN);\nconst end = start + VISIBLE + 2 * OVERSCAN;\nreturn items.slice(start, end).map((item) => <Row key={item.id} item={item} />);',
      },
      takeawayIndex: 2,
      sceneAlt:
        'The same list with all 10,000 rows mounted. Then the blocks above and below disappear and only eight rows stay mounted: four in the viewport and two dashed overscan rows on each side. The DOM panel drops to 8 rows and 48 nodes. With nothing above or below the rows, the scrollbar thumb turns red and fills half the track.',
      startState: { cost: allMountedCost },
      frames: [{ at: 600, set: { mounted: 'window', cost: windowCost } }],
    },
    {
      id: 'spacers',
      tag: 'TECHNIQUE',
      tone: 'res',
      title: 'Spacers keep the scrollbar honest',
      shortTitle: 'Let the browser skip',
      body: [
        'With only eight rows in it, the list is eight rows tall, and the scrollbar says there is almost nothing to scroll. Put an empty block above and below the mounted rows, as tall as the rows they replace.',
        'With a fixed row height that is one multiplication per block. The thumb goes back to its true size and place.',
      ],
      keyIdea: 'Spacers stand in for unmounted rows, so the scroll height stays true.',
      code: {
        language: 'tsx',
        source:
          '<div style={{ height: start * ROW_PX }} />\n{visibleRows}\n<div style={{ height: (items.length - end) * ROW_PX }} />',
      },
      takeawayIndex: 2,
      sceneAlt:
        'Eight rows are mounted and the scrollbar thumb is red and half the track tall, because nothing stands in for the other rows. Dashed spacer blocks then appear: 1,198 rows or 47,920 pixels above, and 8,794 rows or 351,760 pixels below. The thumb shrinks to a small grey mark near the top of the track, where row 1,201 really is.',
      startState: { ...windowed, spacers: false },
      frames: [{ at: 600, set: { spacers: true } }],
    },
    {
      id: 'css-containment',
      tag: 'ALTERNATIVE',
      tone: 'ev',
      title: 'Or let the browser skip the work',
      shortTitle: 'What a window costs',
      body: [
        'Sometimes every row can stay. `content-visibility: auto` lets the browser skip layout and paint for rows far from view, and `contain-intrinsic-size` holds their place.',
        'Find in page and focus keep working, because the rows are still there. So are the nodes, the memory and the work of creating each row.',
      ],
      keyIdea: 'Containment trims rendering work. A window removes the nodes.',
      code: {
        language: 'tsx',
        source:
          "<li style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 40px' }}>\n  {item.title}\n</li>",
      },
      takeawayIndex: 3,
      sceneAlt:
        'All 10,000 rows are mounted again, with red blocks above and below. A content-visibility: auto chip then appears in the DOM panel, and the blocks and rows outside the viewport turn grey and read skipped. The DOM panel still counts 10,000 rows and 60,000 nodes, while the simulated render cost falls from 900 to 350 ms.',
      startState: { cost: allMountedCost },
      frames: [{ at: 600, set: { contain: true, cost: cost('350 ms') } }],
    },
    {
      id: 'costs',
      tag: 'TRADE-OFF',
      tone: 'bad',
      title: 'What a window costs',
      shortTitle: 'Measure first',
      body: [
        'Rows of different heights must be measured, and the spacers corrected as they are. A focused row that scrolls out of the window is unmounted, and focus is lost unless that row stays.',
        'Find in page cannot see rows that are not there. Coming back to the list needs the saved scroll offset, and the right rows mounted to land on it.',
      ],
      keyIdea: 'Each row you skip is a row the browser can no longer help with.',
      takeawayIndex: 3,
      sceneAlt:
        'The virtualized list with its spacers, eight rows mounted and an honest scrollbar. Four red chips light up one after another in the DOM panel: row heights, focus, find in page and scroll restore.',
      startState: windowed,
      frames: [
        { at: 300, set: { costs: 1 } },
        { at: 900, set: { costs: 2 } },
        { at: 1500, set: { costs: 3 } },
        { at: 2100, set: { costs: 4 } },
      ],
    },
    {
      id: 'measure-first',
      tag: 'SUMMARY',
      tone: 'neutral',
      title: 'Measure first',
      shortTitle: '',
      body: [
        'Profile the list on a slow phone before adding a library. If a few hundred rows render quickly, plain rendering or pagination is simpler and keeps every browser feature.',
        'Virtualize when the profile shows the length of the list is the cost, and plan focus, search and scroll position from the start.',
      ],
      keyIdea: 'Virtualize when measurements say the list is the bottleneck, not before.',
      takeawayIndex: 3,
      sceneAlt:
        'A table replaces the diagram. A paginated table of 25 rows is marked render all, a few hundred simple rows measure first, a long page that people search is marked CSS containment, and a feed that keeps loading and thousands of rows on one screen are marked virtualize.',
      startState: windowed,
      frames: [],
      summary: {
        title: 'SHOULD THIS LIST BE VIRTUALIZED?',
        rows: [
          { label: 'A paginated table, 25 rows a page', verdict: 'Render all', tone: 'ok' },
          { label: 'A few hundred simple rows', verdict: 'Measure first', tone: 'ok' },
          {
            label: 'A long page people search with Ctrl+F',
            verdict: 'CSS containment',
            tone: 'ok',
          },
          { label: 'A feed that keeps loading as you scroll', verdict: 'Virtualize', tone: 'warn' },
          { label: 'Thousands of rows on one screen', verdict: 'Virtualize', tone: 'warn' },
        ],
      },
    },
  ],
};
