import { memo, type HTMLAttributes, type ReactNode } from 'react';
import messages from '@messages/en.json';
import { Card, Pill } from '@/components/ui';
import type { Step } from '@/engine/types';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';
import { CodeBlock } from './CodeBlock';

const text = messages.lesson;

/** The parts of a step that the card shows. The scene state does not matter here. */
export type StepCardStep = Pick<
  Step<unknown>,
  'tag' | 'tone' | 'title' | 'body' | 'keyIdea' | 'code'
>;

export interface StepCardProps {
  step: StepCardStep;
  /** Zero-based. */
  stepIndex: number;
  stepCount: number;
  /**
   * Every step of the lesson, in order. The card is then always as tall as the tallest step, at
   * whatever width it has, so changing step never moves what is below it. Without it the card is
   * as tall as the step on show.
   */
  reserveFor?: readonly StepCardStep[];
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

/** The text of one step: its number, tag, title, paragraphs, key idea and code sample. */
function StepText({
  step,
  stepIndex,
  stepCount,
  className,
  ...rest
}: {
  step: StepCardStep;
  stepIndex: number;
  stepCount: number;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex min-w-0 flex-col [grid-area:1/1]', className)} {...rest}>
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
  );
}

/**
 * An invisible copy of every step, laid in the same grid cell as the step on show, so the cell
 * is as tall as the tallest one. The copies are only there to take up room: they are hidden from
 * sight (`invisible`), from assistive technology (`aria-hidden`), from the keyboard and from
 * clicks (`inert`), and they are not in the live region, so a screen reader never reads a step
 * twice. Memoised, because the player re-renders the card on every frame.
 */
const StepSizers = memo(function StepSizers({ steps }: { steps: readonly StepCardStep[] }) {
  return steps.map((step, index) => (
    <StepText
      key={index}
      step={step}
      stepIndex={index}
      stepCount={steps.length}
      className="pointer-events-none invisible select-none"
      aria-hidden="true"
      inert
      data-step-sizer=""
    />
  ));
});

/**
 * The card for the step on show: its number, a tag, the title, up to two paragraphs, the key
 * idea and an optional code sample. That text is a polite live region, so a screen reader
 * announces each new step. The controls in `children` sit outside the region, so they are not
 * read out every time the step changes.
 *
 * With `reserveFor`, the card keeps the height of the tallest step (see `StepSizers`): the
 * visible text and the invisible copies share one grid cell. The live region holds the visible
 * step only, so what a screen reader hears is the same with or without the reserve.
 */
export function StepCard({
  step,
  stepIndex,
  stepCount,
  reserveFor,
  children,
  className,
}: StepCardProps) {
  return (
    <Card
      as="section"
      aria-label={text.stepCardLabel}
      className={cx('flex flex-col gap-4', className)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)]">
        <StepText step={step} stepIndex={stepIndex} stepCount={stepCount} aria-live="polite" />
        {reserveFor && <StepSizers steps={reserveFor} />}
      </div>
      {children}
    </Card>
  );
}
