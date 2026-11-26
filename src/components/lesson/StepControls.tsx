import messages from '@messages/en.json';
import { Button, Kbd } from '@/components/ui';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

const text = messages.player;

export interface StepControlsProps {
  /** Zero-based index of the step that is showing. */
  stepIndex: number;
  /** How many steps the lesson has. */
  stepCount: number;
  /** The current step's `shortTitle`: what the Next button says comes next. */
  nextTitle: string;
  /** Text of the Next button on the last step. Defaults to "Restart lesson". */
  finalLabel?: string;
  /**
   * The `shortTitle` of every step, in order. The button is then as tall as its longest label
   * at the width it has (a long label wraps to two lines on a phone), so changing step never
   * changes the height of the card (see `StepCard`). Without it the button fits the label on show.
   */
  reserveFor?: readonly string[];
  onBack: () => void;
  /** On the last step this runs too: the page decides whether it restarts or moves on. */
  onNext: () => void;
  className?: string;
}

/**
 * Back and Next, and the keyboard hint. Native buttons. Back is disabled on the first step;
 * on the last step Next becomes a restart (or whatever `finalLabel` says). The dots that jump
 * to a step are `Stepper`, which sits under the diagram.
 */
export function StepControls({
  stepIndex,
  stepCount,
  nextTitle,
  finalLabel = text.restart,
  reserveFor,
  onBack,
  onNext,
  className,
}: StepControlsProps) {
  const isLast = stepIndex === stepCount - 1;
  const label = isLast ? finalLabel : format(text.next, { title: nextTitle });
  // Every label the button can have: one per step, and the last step's own.
  const labels = reserveFor?.map((title, i) =>
    i === reserveFor.length - 1 ? finalLabel : format(text.next, { title }),
  );

  return (
    <div className={cx('flex flex-col gap-2.5', className)}>
      <div className="flex gap-2.5">
        <Button onClick={onBack} disabled={stepIndex === 0}>
          {text.back}
        </Button>
        <Button variant="primary" className="flex-1" onClick={onNext}>
          {labels ? (
            // The label on show and an invisible copy of each possible label, in one grid cell.
            // The copies are hidden from assistive technology, so the button's name is the one
            // label on show.
            <span className="grid">
              <span className="[grid-area:1/1]">{label}</span>
              {labels.map((other, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  data-label-sizer=""
                  className="invisible [grid-area:1/1]"
                >
                  {other}
                </span>
              ))}
            </span>
          ) : (
            label
          )}
        </Button>
      </div>

      <p className="font-mono text-meta text-muted-text">
        <Kbd>←</Kbd> <Kbd>→</Kbd> {text.hint.step} · <Kbd>R</Kbd> {text.hint.replay} ·{' '}
        <Kbd>Space</Kbd> {text.hint.pause}
      </p>
    </div>
  );
}
