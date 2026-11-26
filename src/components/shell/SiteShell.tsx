import type { ReactNode } from 'react';
import messages from '@messages/en.json';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** The id of the page's `<main>`, which the skip link points at. Each page renders its own. */
export const MAIN_ID = 'main';

/**
 * Header, content and footer, with a link that lets a keyboard user skip the header. Used by
 * the routes' layout and by the 404 page, which sits outside the layout. The pages under
 * `/dev/` have their own bare frames and do not use it.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col gap-4">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-10 rounded-field bg-ink px-3 py-2 font-medium text-paper focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {messages.siteNav.skip}
      </a>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
