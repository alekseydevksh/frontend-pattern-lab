import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { SiteHeader } from './SiteHeader';

const meta = {
  title: 'Shell/SiteHeader',
  component: SiteHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The header of every lesson and catalog page: the brand (a link home), a link to all lessons, a link to the source, and the theme toggle. Wraps on a narrow screen.',
      },
    },
  },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BothThemes: Story = {
  render: () => (
    <ThemePair stacked>
      <SiteHeader />
    </ThemePair>
  ),
};
