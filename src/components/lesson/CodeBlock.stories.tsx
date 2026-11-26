import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from '@/stories/ThemePair';
import { CodeBlock } from './CodeBlock';

const source =
  'onLike() {\n  cache.set(post.id, withLike(post)); // screen changes now\n  api.like(post.id);                  // network catches up\n}';

const meta = {
  title: 'Lesson/CodeBlock',
  component: CodeBlock,
  args: { language: 'ts', source },
  parameters: {
    docs: {
      description: {
        component:
          'A short code sample in plain monospace. A long line scrolls inside the block, so the block takes keyboard focus and is named "Code example".',
      },
    },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Json: Story = {
  args: {
    language: 'json',
    source: '{ "type": "DOCUMENT_SIGNED",\n  "payload": { "id": "nda" } }',
  },
};

/** A sample with a long line, in the light and the dark theme at once. */
export const BothThemes: Story = {
  render: () => (
    <ThemePair>
      <CodeBlock
        language="ts"
        source={
          'const previous = cache.get(id);\ncache.set(id, { ...previous, liked: true, likes: previous.likes + 1 });\ntry { await api.like(id); }\ncatch { cache.set(id, previous); toast("Could not like. Try again."); }'
        }
      />
    </ThemePair>
  ),
};
