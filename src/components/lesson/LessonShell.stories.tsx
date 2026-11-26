import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { optimisticUi } from '@content/lessons/optimistic-ui';
import { pushPullSync } from '@content/lessons/push-pull-sync';
import { ThemePair } from '@/stories/ThemePair';
import { LessonHeader } from './LessonHeader';
import { LessonShell } from './LessonShell';

const meta = {
  title: 'Lesson/LessonShell',
  component: LessonShell,
  args: {
    lesson: optimisticUi,
    header: <LessonHeader lesson={optimisticUi} lessonCount={2} />,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The lesson page body, built from a lesson from `content/lessons`: the header, the three metrics, the diagram, the step dots, the step card and the checklist. It runs the player, so the arrow keys, R and Space work on it. On a summary step the verdict table replaces the diagram.',
      },
    },
  },
} satisfies Meta<typeof LessonShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OptimisticUi: Story = {};
export const PushPullSync: Story = {
  args: { lesson: pushPullSync, header: <LessonHeader lesson={pushPullSync} lessonCount={2} /> },
};

/** Lesson 1 in the light and the dark theme at once, one above the other. */
export const BothThemes: Story = {
  render: (args) => (
    <div className="p-4">
      <ThemePair stacked>
        <LessonShell {...args} />
      </ThemePair>
    </div>
  ),
};
