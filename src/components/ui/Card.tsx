import { createElement } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** The element to render. Use `section` or `article` when the card has its own heading. */
  as?: 'div' | 'section' | 'article' | 'aside';
  /** `none` leaves the padding to the content, for example a full-width figure. */
  padding?: 'none' | 'md';
}

/** The panel that holds a stage, a step or a list: panel background, thin border, soft shadow. */
export function Card({ as = 'div', padding = 'md', className, ...props }: CardProps) {
  return createElement(as, {
    className: cx(
      'min-w-0 rounded-card border-[1.5px] border-line bg-panel text-ink shadow-card',
      padding === 'md' && 'p-5',
      className,
    ),
    ...props,
  });
}
