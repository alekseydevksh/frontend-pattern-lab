import type { ReactNode } from 'react';
import Link from 'next/link';
import messages from '@messages/en.json';
import { lessons } from '@content/lessons';
import { ThemeToggle } from '@/components/ui';
import { cx } from '@/lib/cx';

const nav = messages.siteNav;
const footer = messages.footer;

/**
 * A temporary frame for the lesson pages: the brand, a link to each lesson, the theme toggle,
 * and the credit line. M4 replaces it with the real app shell and the catalog. It is here so
 * the two ported lessons can be reached and compared with the prototype in the meantime.
 */
export function LessonsFrame({ current, children }: { current: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="flex items-center gap-2.5 font-display text-[21px] leading-none font-extrabold tracking-tight">
          <span
            aria-hidden="true"
            className="relative size-[30px] rounded-[8px] border-2 border-ink bg-panel"
          >
            <span className="absolute top-1 left-1 size-2 rounded-full bg-req" />
            <span className="absolute right-1 bottom-1 size-2 rounded-full bg-res" />
          </span>
          {nav.brand}
        </p>
        <nav aria-label={nav.label} className="flex flex-1 flex-wrap gap-2">
          {lessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/lessons/${lesson.slug}`}
              aria-current={lesson.slug === current ? 'page' : undefined}
              className={cx(
                'flex items-center gap-2 rounded-field border-[1.5px] px-3 py-1.5 font-medium',
                lesson.slug === current
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-panel text-ink hover:bg-paper',
              )}
            >
              <span className="font-mono text-label font-semibold opacity-75">
                {String(lesson.order).padStart(2, '0')}
              </span>
              {lesson.title}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <footer className="max-w-[90ch] text-[12.5px] text-muted-text">
        <p>
          {footer.intro}{' '}
          <a className="text-ink underline" href={footer.articleUrl}>
            “{footer.articleTitle}”
          </a>{' '}
          {footer.by}{' '}
          <a className="text-ink underline" href={footer.sampleUrl}>
            {footer.sampleName}
          </a>
          . {footer.simulated}
        </p>
      </footer>
    </div>
  );
}
