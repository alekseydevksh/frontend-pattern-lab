import messages from '@messages/en.json';
import { cx } from '@/lib/cx';

export interface CodeBlockProps {
  language: 'ts' | 'tsx' | 'json';
  source: string;
  className?: string;
}

/**
 * A short code sample in a bordered block. Plain monospace text, no highlighting. A long line
 * scrolls inside the block, so the block takes keyboard focus: someone who cannot use a mouse
 * can then scroll it with the arrow keys.
 */
export function CodeBlock({ language, source, className }: CodeBlockProps) {
  return (
    <pre
      // A scrollable region must be focusable (axe: scrollable-region-focusable), and a
      // focusable region needs a name. The rule below does not know that pattern.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={messages.lesson.codeLabel}
      data-language={language}
      className={cx(
        'm-0 overflow-x-auto rounded-field border-[1.5px] border-line bg-paper px-3.5 py-3 font-mono text-code text-ink',
        className,
      )}
    >
      <code>{source}</code>
    </pre>
  );
}
