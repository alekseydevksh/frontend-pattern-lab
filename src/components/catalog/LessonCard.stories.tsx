import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { LessonCard } from './LessonCard';

const meta = {
  title: 'Catalog/LessonCard',
  component: LessonCard,
  args: {
    number: 1,
    slug: 'optimistic-ui',
    title: 'Optimistic UI',
    summary:
      'Update the screen first, confirm with the server second, and undo cleanly when the server says no.',
    track: 'Data and state',
    playable: { minutes: 4, stepCount: 6 },
  },
  decorators: [
    (Story) => (
      <div className="max-w-[300px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'One lesson in the catalog. A ready lesson is a link (the title, stretched over the card) with its track, length and saved progress; a lesson that is not ready has no link and says "Coming soon" in words, in a dashed card. Every card carries its track as a label.',
      },
    },
  },
} satisfies Meta<typeof LessonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const ComingSoon: Story = {
  args: {
    number: 3,
    slug: 'virtualization',
    title: 'Virtualization',
    summary:
      'Render only the rows a reader can see, and keep the scrollbar honest while the list stays long.',
    track: 'Rendering and performance',
    playable: undefined,
  },
};

/** A ready and a coming-soon card, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-4">
        <LessonCard {...args} />
        <LessonCard
          number={3}
          slug="virtualization"
          title="Virtualization"
          summary="Render only the rows a reader can see, and keep the scrollbar honest while the list stays long."
          track="Rendering and performance"
        />
      </div>
    </ThemePair>
  ),
};
