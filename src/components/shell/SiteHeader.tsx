import Link from 'next/link';
import messages from '@messages/en.json';
import { ThemeToggle } from '@/components/ui';

const text = messages.siteNav;

/** The site's header: the brand, two links, and the theme toggle. A server component. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3 px-4 pt-4">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display text-[21px] leading-none font-extrabold tracking-tight"
      >
        <span
          aria-hidden="true"
          className="relative size-[30px] rounded-[8px] border-2 border-ink bg-panel"
        >
          <span className="absolute top-1 left-1 size-2 rounded-full bg-req" />
          <span className="absolute right-1 bottom-1 size-2 rounded-full bg-res" />
        </span>
        {text.brand}
      </Link>
      <nav aria-label={text.label} className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/" className="font-medium whitespace-nowrap underline-offset-4 hover:underline">
          {text.lessons}
        </Link>
        <a
          href={text.sourceUrl}
          className="font-medium whitespace-nowrap underline-offset-4 hover:underline"
        >
          {text.source}
        </a>
      </nav>
      <ThemeToggle />
    </header>
  );
}
