import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ThemePair } from '@/stories/ThemePair';
import { StepControls } from './StepControls';

const stepTitles = [
  'Waiting makes a tap feel broken',
  'Update first, ask later',
  'The server can still say no',
  'Keep a snapshot for the way back',
  'Not every action can bet',
  'A quick test',
];

const meta = {
  title: 'Lesson/StepControls',
  component: StepControls,
  args: {
    stepIndex: 2,
    stepTitles,
    nextTitle: 'Keep a snapshot',
    onGoTo: fn(),
    onBack: fn(),
    onNext: fn(),
  },
  argTypes: {
    stepIndex: { control: { type: 'number', min: 0, max: stepTitles.length - 1 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A dot for each step, the step counter, Back and Next, and the keyboard hint. The dots are native buttons: the current one is marked with `aria-current="step"` and each name carries the step title. The last step turns Next into a restart button; the page decides what it does.',
      },
    },
  },
} satisfies Meta<typeof StepControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstStep: Story = { args: { stepIndex: 0 } };
export const LastStep: Story = { args: { stepIndex: stepTitles.length - 1 } };
export const LastStepNextLesson: Story = {
  args: { stepIndex: stepTitles.length - 1, finalLabel: 'Next lesson: Push + Pull Sync →' },
};

/** First, middle and last step, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-6">
        <StepControls {...args} stepIndex={0} />
        <StepControls {...args} stepIndex={2} />
        <StepControls {...args} stepIndex={stepTitles.length - 1} />
      </div>
    </ThemePair>
  ),
};
