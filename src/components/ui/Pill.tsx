import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export type PillTone = 'neutral' | 'req' | 'res' | 'ev' | 'bad';

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  /** Signal colour: req = request, res = server answer, ev = pushed event, bad = failure. */
  tone?: PillTone;
}

// --c is the border and tint colour; --t is the text colour, a variant that meets AA contrast.
const toneClasses: Record<PillTone, string> = {
  neutral: '[--c:var(--muted)] [--t:var(--muted)]',
  req: '[--c:var(--req)] [--t:var(--req-text)]',
  res: '[--c:var(--res)] [--t:var(--res-text)]',
  ev: '[--c:var(--ev)] [--t:var(--ev-text)]',
  bad: '[--c:var(--bad)] [--t:var(--bad-text)]',
};

/**
 * A status label in capitals, coloured by tone. The colour only supports the words: the
 * label itself must always say what the state is.
 */
export function Pill({ tone = 'neutral', className, ...props }: PillProps) {
  return (
    <span
      data-tone={tone}
      className={cx(
        'inline-block rounded-full border-[1.5px] border-(--c) bg-[color-mix(in_srgb,var(--c)_12%,transparent)] px-2.5 py-0.5 font-mono text-label font-semibold tracking-caps text-(--t) uppercase',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
