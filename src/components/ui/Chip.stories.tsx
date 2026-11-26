import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Chip } from './Chip';

const meta = {
  title: 'UI/Chip',
  component: Chip,
  args: { children: '4 min' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <div className="flex flex-wrap gap-2">
        <Chip>4 min</Chip>
        <Chip>Intermediate</Chip>
        <Chip>6 steps</Chip>
      </div>
    </ThemePair>
  ),
};
