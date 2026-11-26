import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Takeaways } from './Takeaways';

const items = [
  'Why waiting for the server makes small actions feel slow',
  'How to update first and send the request in the background',
  'What a rollback needs: a snapshot and a visible error',
  'Which actions should never be optimistic',
];

const meta = {
  title: 'Lesson/Takeaways',
  component: Takeaways,
  args: { items, reached: new Set([0, 1]) },
  parameters: {
    docs: {
      description: {
        component:
          'What the lesson teaches, as a checklist that fills in as the learner reaches the steps that teach each point. A ticked point has a filled box and ink text; a screen reader also hears "reached" or "not reached yet".',
      },
    },
  },
} satisfies Meta<typeof Takeaways>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Started: Story = { args: { reached: new Set([0]) } };
export const HalfWay: Story = {};
export const Done: Story = { args: { reached: new Set([0, 1, 2, 3]) } };

/** None, some and all points reached, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-4">
        <Takeaways {...args} reached={new Set()} />
        <Takeaways {...args} reached={new Set([0, 1])} />
        <Takeaways {...args} reached={new Set([0, 1, 2, 3])} />
      </div>
    </ThemePair>
  ),
};
