import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Card } from './Card';

const meta = {
  title: 'UI/Card',
  component: Card,
  args: {
    children: (
      <>
        <h3 className="mb-2 font-display text-h2 font-extrabold text-balance">
          Waiting makes a tap feel broken
        </h3>
        <p>A card holds one idea. It has a panel background, a thin border and a soft shadow.</p>
      </>
    ),
  },
  argTypes: {
    as: { control: 'inline-radio', options: ['div', 'section', 'article', 'aside'] },
    padding: { control: 'inline-radio', options: ['md', 'none'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoPadding: Story = { args: { padding: 'none' } };

export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <Card {...args} />
    </ThemePair>
  ),
};
