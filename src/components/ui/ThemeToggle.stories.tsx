import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { ThemeToggle } from './ThemeToggle';

const meta = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        component:
          'Switches the whole document between the light and dark theme. In Storybook it changes the same data-theme attribute as the toolbar switch, so the two stay in step.',
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Both halves show the button in its own theme. Clicking it changes the whole page's theme. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <ThemeToggle />
    </ThemePair>
  ),
};
