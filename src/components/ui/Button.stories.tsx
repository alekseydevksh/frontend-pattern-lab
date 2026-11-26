import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Next: update first' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
    type: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Back' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };
export const Small: Story = { args: { size: 'sm', children: 'Replay' } };

/** Every variant, size and state, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Next: update first</Button>
        <Button variant="secondary">Back</Button>
        <Button variant="primary" disabled>
          Next (disabled)
        </Button>
        <Button variant="secondary" disabled>
          Back (disabled)
        </Button>
        <Button size="sm">Replay</Button>
        <Button size="sm" variant="primary">
          Resume
        </Button>
      </div>
    </ThemePair>
  ),
};
