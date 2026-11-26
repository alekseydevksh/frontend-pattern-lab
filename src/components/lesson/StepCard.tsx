import type { ReactNode } from 'react';
import messages from '@messages/en.json';
import { Card, Pill } from '@/components/ui';
import type { Step } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';
import { CodeBlock } from './CodeBlock';

const text = messages.lesson;

export interface StepCardProps {
  /** The step's text. The scene state does not matter here. */
  step: Pick<Step<unknown>, 'tag' | 'tone' | 'title' | 'body' | 'keyIdea' | 'code'>;
  /** Zero-based. */
  stepIndex: number;
  stepCount: number;
  /** The controls under the text (Back, Next, the keyboard hint). Not part of the live region. */
  children?: ReactNode;
  className?: string;
}

/**
 * Splits a paragraph at backticks: `like this` becomes inline code. An odd, unclosed backtick
 * is left as it is.
 */
export function inlineCode(paragraph: string): ReactNode[] {
  return paragraph.split(/(`[^`]+`)/).map((part, i) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <code
        key={i}
        className="rounded-tag border border-line bg-paper px-[5px] py-px font-mono text-[0.88em]"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/**
 * The card for the step on show: its number, a tag, the title, up to two paragraphs, the key
 * idea and an optional code sample. That text is a polite live region, so a screen reader
 * announces each new step. The controls in `children` sit outside the region, so they are not
 * read out every time the step changes.
 */
export function StepCard({ step, stepIndex, stepCount, children, className }: StepCardProps) {
  return (
    <Card
      as="section"
      aria-label={text.stepCardLabel}
      className={cx('flex flex-col gap-4', className)}
    >
      <div aria-live="polite" className="flex flex-col">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <p className="font-mono text-label font-medium tracking-caps-wide text-muted-text uppercase">
            {format(text.stepCaption, { current: stepIndex + 1, total: stepCount })}
          </p>
          <Pill tone={step.tone}>{step.tag}</Pill>
        </div>
        <h2 className="mb-2.5 font-display text-h2 font-extrabold tracking-tight text-balance">
          {step.title}
        </h2>
        {step.body.map((paragraph) => (
          <p key={paragraph} className="mb-2.5 max-w-[60ch]">
            {inlineCode(paragraph)}
          </p>
        ))}
        <p className="my-3.5 rounded-r-field border-l-4 border-ev bg-[color-mix(in_srgb,var(--ev)_10%,transparent)] px-3.5 py-2.5">
          <span className="mb-0.5 block font-mono text-micro font-semibold tracking-caps-wide text-ev-text uppercase">
            {text.keyIdea}
          </span>
          {step.keyIdea}
        </p>
        {step.code && <CodeBlock language={step.code.language} source={step.code.source} />}
      </div>
      {children}
    </Card>
  );
}
