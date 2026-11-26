'use client';

import messages from '@messages/en.json';
import { progressState } from '@/lib/progress';
import { useProgress } from '@/lib/useProgress';
import { format } from '@/lib/format';

const text = messages.catalog;

export interface ProgressNoteProps {
  slug: string;
  stepCount: number;
}

/**
 * Where the learner is in a lesson, from saved progress: "Step 3 of 6" with a thin bar, or
 * "Completed". It draws nothing on the server and on the first client render (saved progress
 * is applied after hydration, so the HTML matches), and it holds its height while empty, so
 * the card does not grow when the saved value arrives. The words carry the state; the bar
 * only repeats it.
 */
export function ProgressNote({ slug, stepCount }: ProgressNoteProps) {
  const state = progressState(useProgress(), { slug, stepCount });
  const done = state.kind === 'completed';
  const fraction =
    state.kind === 'completed' ? 1 : state.kind === 'started' ? state.step / state.stepCount : 0;
  return (
    <div className="min-h-[34px]" data-progress={state.kind}>
      {state.kind !== 'none' && (
        <>
          <p className="font-mono text-meta font-medium text-ink">
            <span className="sr-only">{text.progressLabel}: </span>
            {state.kind === 'completed'
              ? text.progressCompleted
              : format(text.progressStarted, { step: state.step, total: state.stepCount })}
          </p>
          <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
            <div
              className={done ? 'h-full bg-res' : 'h-full bg-req'}
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
