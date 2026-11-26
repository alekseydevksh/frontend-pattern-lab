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

/**
 * One labelled number in the strip above a diagram. The label is set in capitals by CSS.
 *
 * The label wraps instead of being cut off: on a phone a tile is about 90 px wide, and labels
 * such as "Client vs server" do not fit on one line. The value sits at the bottom of the tile, so
 * in a row of tiles (which stretch to the tallest) the values stay level when one label wraps.
 */
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
        'flex min-w-0 flex-col rounded-field border-[1.5px] border-line bg-paper px-2.5 py-2',
        className,
      )}
      {...props}
    >
      <span className="block font-mono text-micro tracking-caps text-balance wrap-break-word text-muted uppercase">
        {label}
      </span>
      <span
        className={cx(
          'mt-auto block font-mono text-metric font-semibold tabular-nums transition-colors duration-(--duration-ui)',
          toneClasses[tone],
        )}
      >
        {value}
      </span>
    </div>
  );
}
