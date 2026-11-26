import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

/** A keyboard key cap, for hints such as "← →  step". Pass the key as children. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cx(
        'rounded-tag border border-b-2 border-line bg-paper px-[5px] font-mono text-label text-ink',
        className,
      )}
      {...props}
    />
  );
}
