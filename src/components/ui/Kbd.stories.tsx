import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Kbd } from './Kbd';

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  args: { children: 'Space' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <p className="font-mono text-meta text-muted">
        <Kbd>←</Kbd> <Kbd>→</Kbd> step · <Kbd>R</Kbd> replay · <Kbd>Space</Kbd> pause
      </p>
    </ThemePair>
  ),
};
