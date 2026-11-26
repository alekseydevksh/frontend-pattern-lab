import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { PROGRESS_EVENT, writeProgress, type ProgressMap } from '@/lib/progress';
import { ThemePair } from '@/stories/ThemePair';
import { ProgressNote } from './ProgressNote';

/** Puts progress in the browser's storage, as a returning learner would have it. */
const saved = (progress: ProgressMap): Decorator =>
  function Saved(Story) {
    writeProgress(progress);
    window.dispatchEvent(new Event(PROGRESS_EVENT));
    return <Story />;
  };

const meta = {
  title: 'Catalog/ProgressNote',
  component: ProgressNote,
  args: { slug: 'demo', stepCount: 6 },
  parameters: {
    docs: {
      description: {
        component:
          'Where the learner is in a lesson, read from saved progress after hydration: "Step 3 of 6" with a thin bar, or "Completed". It draws nothing before then and holds its height while empty, so a card never grows. The words carry the state; the bar only repeats it. These stories write to the browser storage.',
      },
    },
  },
} satisfies Meta<typeof ProgressNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingSaved: Story = { decorators: [saved({})] };
export const Started: Story = {
  decorators: [saved({ demo: { step: 2, ticked: [0, 1, 2], completed: false } })],
};
export const Completed: Story = {
  decorators: [saved({ demo: { step: 5, ticked: [0, 1, 2, 3], completed: true } })],
};

/** In progress, in the light and the dark theme at once. */
export const BothThemes: Story = {
  decorators: [saved({ demo: { step: 2, ticked: [0, 1, 2], completed: false } })],
  render: (args) => (
    <ThemePair>
      <ProgressNote {...args} />
    </ThemePair>
  ),
};
