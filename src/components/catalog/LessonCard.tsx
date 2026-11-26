import Link from 'next/link';
import messages from '@messages/en.json';
import { Card, Chip, Pill } from '@/components/ui';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';
import { ProgressNote } from './ProgressNote';

const text = messages.catalog;

export interface LessonCardProps {
  /** The lesson's number in the catalog, from 1. */
  number: number;
  slug: string;
  title: string;
  summary: string;
  /** The lesson's track, shown as a label on the card. */
  track: string;
  /** Present only for a lesson that can be played. Without it the card says "coming soon". */
  playable?: { minutes: number; stepCount: number };
}

/**
 * One lesson in the catalog. A ready lesson is a link (the title is the link, stretched over
 * the whole card, and the card shows a focus ring when it has focus); a lesson that is not
 * ready has no link, and says so in words. Server component: the only client part is
 * `ProgressNote`, which fills in saved progress after hydration.
 */
export function LessonCard({ number, slug, title, summary, track, playable }: LessonCardProps) {
  const label = String(number).padStart(2, '0');
  return (
    <Card
      as="article"
      className={cx(
        'relative flex flex-1 flex-col gap-2.5 px-[18px] py-4',
        playable
          ? 'transition-colors duration-(--duration-ui) hover:bg-paper has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ev'
          : 'border-dashed',
      )}
    >
      <p className="flex items-center justify-between gap-2 font-mono text-label font-semibold tracking-caps-wide text-muted-text uppercase">
        <span>
          <span aria-hidden="true">{label}</span>
          <span className="sr-only">{format(text.lessonNumber, { number })}</span>
        </span>
        {!playable && <Pill>{text.soon}</Pill>}
      </p>
      <h3
        className={cx(
          'font-display text-[19px] leading-tight font-extrabold tracking-tight text-balance',
          !playable && 'text-muted-text',
        )}
      >
        {playable ? (
          <Link
            href={`/lessons/${slug}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      <p className="text-muted-text">{summary}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Chip>
          <span className="sr-only">{text.track}: </span>
          {track}
        </Chip>
        {playable && (
          <>
            <Chip>{format(messages.lesson.minutes, { minutes: playable.minutes })}</Chip>
            <Chip>{format(messages.lesson.stepCount, { count: playable.stepCount })}</Chip>
          </>
        )}
      </div>
      {playable && <ProgressNote slug={slug} stepCount={playable.stepCount} />}
    </Card>
  );
}
