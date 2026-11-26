import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { SiteFooter } from './SiteFooter';

const meta = {
  title: 'Shell/SiteFooter',
  component: SiteFooter,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The footer: the credit for the article and the sample site (both links live), the note that diagram numbers are simulated, and the licence notes for code, lesson text and fonts.',
      },
    },
  },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BothThemes: Story = {
  render: () => (
    <ThemePair stacked>
      <SiteFooter />
    </ThemePair>
  ),
};
