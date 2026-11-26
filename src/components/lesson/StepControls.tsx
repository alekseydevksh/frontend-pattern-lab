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
  onBack,
  onNext,
  className,
}: StepControlsProps) {
  const isLast = stepIndex === stepCount - 1;

  return (
    <div className={cx('flex flex-col gap-2.5', className)}>
      <div className="flex gap-2.5">
        <Button onClick={onBack} disabled={stepIndex === 0}>
          {text.back}
        </Button>
        <Button variant="primary" className="flex-1" onClick={onNext}>
          {isLast ? finalLabel : format(text.next, { title: nextTitle })}
        </Button>
      </div>

      <p className="font-mono text-meta text-muted-text">
        <Kbd>←</Kbd> <Kbd>→</Kbd> {text.hint.step} · <Kbd>R</Kbd> {text.hint.replay} ·{' '}
        <Kbd>Space</Kbd> {text.hint.pause}
      </p>
    </div>
  );
}
