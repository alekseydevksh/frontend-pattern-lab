import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { MetricTile } from './MetricTile';

const meta = {
  title: 'UI/MetricTile',
  component: MetricTile,
  args: { label: 'UI changes at', value: '0 ms' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'good', 'bad'] } },
} satisfies Meta<typeof MetricTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Good: Story = { args: { label: 'Client vs server', value: 'in sync', tone: 'good' } };
export const Bad: Story = { args: { label: 'Rollback', value: 'yes', tone: 'bad' } };

/** The three tiles of a lesson, as the strip above the diagram shows them. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="UI changes at" value="0 ms" />
        <MetricTile label="Client vs server" value="in sync" tone="good" />
        <MetricTile label="Rollback" value="yes" tone="bad" />
      </div>
    </ThemePair>
  ),
};
