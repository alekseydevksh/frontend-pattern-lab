import Link from 'next/link';
import type { Metadata } from 'next';
import messages from '@messages/en.json';
import { MAIN_ID, SiteShell } from '@/components/shell/SiteShell';

const text = messages.notFound;

export const metadata: Metadata = {
  title: { absolute: `${text.title} · ${messages.site.name}` },
  // No robots tag: Next.js already writes `noindex` into the not-found page.
};

/**
 * The 404 page. It is not inside the routes' layout, so it carries the header and footer
 * itself. With a static export it becomes `404.html`, which the host serves for any address
 * that has no page.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <main id={MAIN_ID} className="mx-auto flex max-w-[1240px] flex-col items-start gap-3 px-4">
        <p className="font-mono text-label font-semibold tracking-caps-wide text-muted-text uppercase">
          404
        </p>
        <h1 className="font-display text-h1 font-extrabold tracking-tight text-balance">
          {text.heading}
        </h1>
        <p className="max-w-[56ch] text-muted-text">{text.body}</p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-control border-[1.5px] border-ink bg-ink px-4 py-2.5 font-semibold text-paper transition-colors duration-(--duration-ui) hover:bg-[color-mix(in_srgb,var(--ink)_85%,var(--paper))]"
        >
          {text.home}
        </Link>
      </main>
    </SiteShell>
  );
}
