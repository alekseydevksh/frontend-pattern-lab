import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { MetricsRow } from './MetricsRow';

const labels = ['UI changes at', 'Server answers at', 'Rollback'];

const meta = {
  title: 'Lesson/MetricsRow',
  component: MetricsRow,
  args: {
    labels,
    metrics: [{ value: '0 ms' }, { value: '600 ms' }, { value: 'yes', tone: 'bad' }],
  },
  parameters: {
    docs: {
      description: {
        component:
          'The strip of three labelled values above the diagram. The lesson names them; the scene says what they are right now. A tone colours the value, and the value always says the same in words.',
      },
    },
  },
} satisfies Meta<typeof MetricsRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = {
  args: { metrics: [{ value: '—' }, { value: '—' }, { value: '—' }] },
};

/** A neutral, a good and a bad value, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <MetricsRow
        labels={['Client vs server', 'Socket', 'Pending badge']}
        metrics={[{ value: 'stale', tone: 'bad' }, { value: 'open', tone: 'good' }, { value: '1' }]}
      />
    </ThemePair>
  ),
};
