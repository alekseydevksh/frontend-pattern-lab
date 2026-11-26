import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ThemePair } from '@/stories/ThemePair';
import { PlayerControls } from './PlayerControls';

const meta = {
  title: 'Lesson/PlayerControls',
  component: PlayerControls,
  args: { isPaused: false, reducedMotion: false, onReplay: fn(), onTogglePause: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Replay and Pause or Resume for the step that is playing. The page wires them to `useLessonPlayer`. Pause is disabled under reduced motion, where nothing animates.',
      },
    },
  },
} satisfies Meta<typeof PlayerControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {};
export const Paused: Story = { args: { isPaused: true } };
export const ReducedMotion: Story = { args: { reducedMotion: true } };

/** Playing, paused and reduced motion, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: (args) => (
    <ThemePair>
      <div className="flex flex-col gap-4">
        <PlayerControls {...args} />
        <PlayerControls {...args} isPaused />
        <PlayerControls {...args} reducedMotion />
      </div>
    </ThemePair>
  ),
};
