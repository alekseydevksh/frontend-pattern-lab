import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ThemePair } from '@/stories/ThemePair';
import { StepControls } from './StepControls';

const stepCount = 6;

const meta = {
  title: 'Lesson/StepControls',
  component: StepControls,
  args: {
    stepIndex: 2,
    stepCount,
    nextTitle: 'Keep a snapshot',
    onBack: fn(),
    onNext: fn(),
  },
  argTypes: {
    stepIndex: { control: { type: 'number', min: 0, max: stepCount - 1 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Back and Next, and the keyboard hint. Next says what comes next; on the last step it becomes a restart button, or whatever the page passes as `finalLabel`. The dots that jump to a step are `Stepper`.',
      },
    },
  },
} satisfies Meta<typeof StepControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstStep: Story = { args: { stepIndex: 0 } };
export const LastStep: Story = { args: { stepIndex: stepCount - 1 } };
export const LastStepNextLesson: Story = {
  args: { stepIndex: stepCount - 1, finalLabel: 'Next lesson: Push + Pull Sync →' },
};

/** First, middle and last step, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-6">
        <StepControls {...args} stepIndex={0} />
        <StepControls {...args} stepIndex={2} />
        <StepControls {...args} stepIndex={stepCount - 1} />
      </div>
    </ThemePair>
  ),
};
