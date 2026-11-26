import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the filled main action; `secondary` is the outlined one. */
  variant?: ButtonVariant;
  /** `md` for step navigation; `sm` for compact tools such as Replay and Pause. */
  size?: ButtonSize;
}

const base =
  'inline-flex items-center justify-center gap-2 border-[1.5px] transition-colors duration-(--duration-ui) disabled:cursor-not-allowed disabled:opacity-40';

const sizeClasses: Record<ButtonSize, string> = {
  md: 'rounded-control px-4 py-2.5 font-semibold',
  sm: 'rounded-field px-3 py-[5px] font-mono text-meta font-medium',
};

const variantClasses: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: {
    md: 'border-ink bg-ink text-paper enabled:hover:bg-[color-mix(in_srgb,var(--ink)_85%,var(--paper))]',
    sm: 'border-ink bg-ink text-paper enabled:hover:bg-[color-mix(in_srgb,var(--ink)_85%,var(--paper))]',
  },
  secondary: {
    md: 'border-ink bg-panel text-ink enabled:hover:bg-paper',
    sm: 'border-line bg-panel text-ink enabled:hover:bg-paper',
  },
};

/** A native button. Type defaults to "button" so it never submits a form by accident. */
export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(base, sizeClasses[size], variantClasses[variant][size], className)}
      {...props}
    />
  );
}
