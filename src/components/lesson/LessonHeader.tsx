import messages from '@messages/en.json';
import { Chip } from '@/components/ui';
import type { AnyLesson } from '@/engine/types';
import { format } from '@/lib/format';

const text = messages.lesson;

/** The id of the lesson's <h1>. The shell names its stage card by it. */
export const LESSON_TITLE_ID = 'lesson-title';

export interface LessonHeaderProps {
  lesson: Pick<AnyLesson, 'title' | 'summary' | 'minutes' | 'level' | 'track' | 'order' | 'steps'>;
  /** How many lessons there are. Without it, the breadcrumb line is left out. */
  lessonCount?: number;
}

/**
 * The top of the stage card: the breadcrumb, the title, the chips and the one-line summary.
 * Static text with no state, so a page renders it on the server and hands it to the shell.
 */
export function LessonHeader({ lesson, lessonCount }: LessonHeaderProps) {
  return (
    <header>
      {lessonCount !== undefined && (
        <p className="font-mono text-meta font-medium tracking-[0.04em] text-muted-text">
          {format(text.crumb, {
            number: String(lesson.order).padStart(2, '0'),
            track: lesson.track,
            lesson: lesson.order,
            total: lessonCount,
          })}
        </p>
      )}
      <h1
        id={LESSON_TITLE_ID}
        className="mt-1.5 mb-2.5 font-display text-h1 font-extrabold tracking-tight text-balance"
      >
        {lesson.title}
      </h1>
      <div className="flex flex-wrap gap-2">
        <Chip>{format(text.minutes, { minutes: lesson.minutes })}</Chip>
        <Chip>{lesson.level}</Chip>
        <Chip>{format(text.stepCount, { count: lesson.steps.length })}</Chip>
      </div>
      <p className="mt-3 mb-3.5 max-w-[64ch] text-muted-text">{lesson.summary}</p>
    </header>
  );
}
