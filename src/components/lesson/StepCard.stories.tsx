import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ThemePair } from '@/stories/ThemePair';
import { StepCard, type StepCardProps } from './StepCard';
import { StepControls } from './StepControls';

const step: StepCardProps['step'] = {
  tag: 'TECHNIQUE',
  tone: 'res',
  title: 'Update first, ask later',
  body: [
    'Change the cache in the same moment as the click. The button fills, the count goes up, and the request leaves in the background.',
    'The server answers no faster than before, but the user no longer waits for it.',
  ],
  keyIdea: 'The screen answers in 0 ms and the network catches up.',
  code: {
    language: 'ts',
    source:
      'onLike() {\n  cache.set(post.id, withLike(post)); // screen changes now\n  api.like(post.id);                  // network catches up\n}',
  },
};

const controls = (
  <StepControls
    stepIndex={1}
    stepCount={6}
    nextTitle="Server can say no"
    onBack={fn()}
    onNext={fn()}
  />
);

const meta = {
  title: 'Lesson/StepCard',
  component: StepCard,
  args: { step, stepIndex: 1, stepCount: 6, children: controls },
  parameters: {
    docs: {
      description: {
        component:
          'The card for the step on show: the step number, a tag, the title, up to two paragraphs, the key idea and an optional code sample. That text is a polite live region; the controls passed as children sit outside it. Backticks in a paragraph make inline code.',
      },
    },
  },
} satisfies Meta<typeof StepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCode: Story = {};
export const WithoutCode: Story = {
  args: {
    step: {
      tag: 'PROBLEM',
      tone: 'bad',
      title: 'Waiting makes a tap feel broken',
      body: [
        'Tap Like. The request leaves, the server writes the change, the answer comes back, and only then does the button change.',
      ],
      keyIdea: 'The user pays the full latency before seeing any result.',
    },
    stepIndex: 0,
  },
};
export const InlineCode: Story = {
  args: {
    step: {
      tag: 'RULES',
      tone: 'req',
      title: 'Give every event a rule',
      body: ['Call `invalidate(["document", id])` for the row, then show a toast.'],
      keyIdea: 'Each event type gets its own small, explicit reaction.',
    },
  },
};

/** With and without code, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <StepCard {...args} />
    </ThemePair>
  ),
};
