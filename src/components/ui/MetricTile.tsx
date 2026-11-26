import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export type MetricTone = 'neutral' | 'good' | 'bad';

export interface MetricTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string;
  value: string;
  /** Colours the value. The value text itself must still say what the state is. */
  tone?: MetricTone;
}

const toneClasses: Record<MetricTone, string> = {
  neutral: 'text-ink',
  good: 'text-res-text',
  bad: 'text-bad-text',
};

/** One labelled number in the strip above a diagram. The label is set in capitals by CSS. */
export function MetricTile({
  label,
  value,
  tone = 'neutral',
  className,
  ...props
}: MetricTileProps) {
  return (
    <div
      data-tone={tone}
      className={cx(
        'min-w-0 rounded-field border-[1.5px] border-line bg-paper px-2.5 py-2',
        className,
      )}
      {...props}
    >
      <span className="block truncate font-mono text-micro tracking-caps text-muted uppercase">
        {label}
      </span>
      <span
        className={cx(
          'block font-mono text-metric font-semibold tabular-nums transition-colors duration-(--duration-ui)',
          toneClasses[tone],
        )}
      >
        {value}
      </span>
    </div>
  );
}
