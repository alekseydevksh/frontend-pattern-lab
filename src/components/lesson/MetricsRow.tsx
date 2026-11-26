import { MetricTile } from '@/components/ui';
import type { Metric } from '@/engine/types';
import { cx } from '@/lib/cx';

export interface MetricsRowProps {
  /** The three labels, from the lesson. */
  labels: readonly string[];
  /** The three values right now, from the scene. */
  metrics: readonly Metric[];
  className?: string;
}

/** The strip of three labelled values above the diagram. */
export function MetricsRow({ labels, metrics, className }: MetricsRowProps) {
  return (
    <div className={cx('grid grid-cols-3 gap-2', className)}>
      {labels.map((label, i) => (
        <MetricTile
          key={label}
          label={label}
          value={metrics[i]?.value ?? ''}
          tone={metrics[i]?.tone}
        />
      ))}
    </div>
  );
}
