import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { Pill } from './Pill';

const meta = {
  title: 'UI/Pill',
  component: Pill,
  args: { children: 'Technique' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'req', 'res', 'ev', 'bad'] } },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: 'neutral', children: 'Summary' } };
export const Request: Story = { args: { tone: 'req', children: 'Technique' } };
export const Response: Story = { args: { tone: 'res', children: 'Pull' } };
export const Event: Story = { args: { tone: 'ev', children: 'Push' } };
export const Failure: Story = { args: { tone: 'bad', children: 'Failure' } };

/** The colour only supports the word: each pill says what it means. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <div className="flex flex-wrap gap-2">
        <Pill>Summary</Pill>
        <Pill tone="req">Technique</Pill>
        <Pill tone="res">Pull</Pill>
        <Pill tone="ev">Push</Pill>
        <Pill tone="bad">Failure</Pill>
      </div>
    </ThemePair>
  ),
};
