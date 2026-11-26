import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ThemePair } from '@/stories/ThemePair';
import { Stepper } from './Stepper';

const stepTitles = [
  'Waiting makes a tap feel broken',
  'Update first, ask later',
  'The server can still say no',
  'Keep a snapshot for the way back',
  'Not every action can bet',
  'A quick test',
];

const meta = {
  title: 'Lesson/Stepper',
  component: Stepper,
  args: { stepIndex: 2, stepTitles, onGoTo: fn() },
  argTypes: { stepIndex: { control: { type: 'number', min: 0, max: stepTitles.length - 1 } } },
  parameters: {
    docs: {
      description: {
        component:
          'A numbered dot for each step, joined by a line that fills as steps are passed. The dots are native buttons: the current one is marked with `aria-current="step"` and each name carries the step title.',
      },
    },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstStep: Story = { args: { stepIndex: 0 } };
export const LastStep: Story = { args: { stepIndex: stepTitles.length - 1 } };

/** First, middle and last step, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-6">
        <Stepper {...args} stepIndex={0} />
        <Stepper {...args} stepIndex={2} />
        <Stepper {...args} stepIndex={stepTitles.length - 1} />
      </div>
    </ThemePair>
  ),
};
