import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

/** A small static label for facts such as reading time or level. Not interactive. */
export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        'inline-block rounded-full border-[1.5px] border-line bg-paper px-2.5 py-0.5 font-mono text-meta font-medium text-ink',
        className,
      )}
      {...props}
    />
  );
}
