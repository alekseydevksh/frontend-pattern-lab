import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { VerdictTable } from './VerdictTable';

const summary = {
  title: 'IS IT SAFE TO UPDATE FIRST?',
  rows: [
    { label: 'Like a post', verdict: 'Optimistic', tone: 'ok' },
    { label: 'Save an item', verdict: 'Optimistic', tone: 'ok' },
    { label: 'Mark a notification as read', verdict: 'Optimistic', tone: 'ok' },
    { label: 'Sign a document', verdict: 'Pending state', tone: 'warn' },
    { label: 'Send a payment', verdict: 'Pending state', tone: 'warn' },
  ],
} as const;

const meta = {
  title: 'Lesson/VerdictTable',
  component: VerdictTable,
  args: {
    summary: { ...summary, rows: [...summary.rows] },
    description:
      'Liking, saving and marking as read are optimistic; signing and paying need a pending state.',
    viewBox: '0 0 640 364',
  },
  parameters: {
    docs: {
      description: {
        component:
          'The table a summary step shows in the place of the diagram. A real table: one row per case, with the verdict as a word in a tinted pill. It takes the same room as the diagram, so nothing moves when the step changes.',
      },
    },
  },
} satisfies Meta<typeof VerdictTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FourRows: Story = {
  args: {
    summary: {
      title: 'WHICH ONE DOES THE JOB?',
      rows: [
        { label: 'First screen load', verdict: 'Pull', tone: 'ok' },
        { label: 'Something changed on the server', verdict: 'Push', tone: 'warn' },
        { label: 'Socket reconnected', verdict: 'Pull', tone: 'ok' },
        { label: 'What is true right now?', verdict: 'Pull', tone: 'ok' },
      ],
    },
    viewBox: '0 0 640 312',
  },
};

/** In the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair stacked>
      <VerdictTable {...args} />
    </ThemePair>
  ),
};
