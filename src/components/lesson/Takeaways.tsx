import messages from '@messages/en.json';
import { Card } from '@/components/ui';
import { cx } from '@/lib/cx';

const text = messages.lesson;

export interface TakeawaysProps {
  /** What the lesson teaches, one line each. */
  items: readonly string[];
  /** Indexes of the items the learner has reached. */
  reached: ReadonlySet<number>;
  className?: string;
}

/**
 * "You'll learn": a checklist that fills in as the learner reaches the steps that teach each
 * point. A point is ticked with a filled box and its words turn from muted to ink; the words
 * "reached" and "not reached yet" are there for a screen reader, so the colour never carries
 * the state alone.
 */
export function Takeaways({ items, reached, className }: TakeawaysProps) {
  return (
    <Card
      as="section"
      aria-labelledby="takeaways-title"
      className={cx('px-5 py-[18px]', className)}
    >
      <p
        id="takeaways-title"
        className="font-mono text-label font-medium tracking-caps-wide text-muted-text uppercase"
      >
        {text.takeawaysTitle}
      </p>
      <ul className="mt-2.5 flex list-none flex-col gap-2 p-0">
        {items.map((item, index) => {
          const done = reached.has(index);
          return (
            <li
              key={item}
              data-reached={done}
              className={cx(
                'flex items-start gap-2.5 transition-colors duration-(--duration-ui)',
                done ? 'text-ink' : 'text-muted-text',
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'mt-[3px] size-4 flex-none rounded-tag border-[1.5px] transition-colors duration-(--duration-ui)',
                  done
                    ? 'border-res bg-res shadow-[inset_0_0_0_3px_var(--panel)]'
                    : 'border-line bg-paper',
                )}
              />
              <span>
                {item}
                <span className="sr-only">
                  {' '}
                  — {done ? text.takeawayReached : text.takeawayNotReached}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
