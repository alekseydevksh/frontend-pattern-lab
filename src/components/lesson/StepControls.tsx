import messages from '@messages/en.json';
import { Button, Kbd } from '@/components/ui';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

const text = messages.player;

export interface StepControlsProps {
  /** Zero-based index of the step that is showing. */
  stepIndex: number;
  /** The title of every step, in order. Its length is the number of steps. */
  stepTitles: readonly string[];
  /** The current step's `shortTitle`: what the Next button says comes next. */
  nextTitle: string;
  /** Text of the Next button on the last step. Defaults to "Restart lesson". */
  finalLabel?: string;
  onGoTo: (index: number) => void;
  onBack: () => void;
  /** On the last step this runs too: the page decides whether it restarts or moves on. */
  onNext: () => void;
  className?: string;
}

/**
 * Where you are and how to move: a dot for each step (visited ones filled), the step counter,
 * Back and Next, and the keyboard hint. Native buttons throughout. The current step's dot has
 * `aria-current="step"`; every dot's name carries the step's title.
 */
export function StepControls({
  stepIndex,
  stepTitles,
  nextTitle,
  finalLabel = text.restart,
  onGoTo,
  onBack,
  onNext,
  className,
}: StepControlsProps) {
  const total = stepTitles.length;
  const isLast = stepIndex === total - 1;

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-label tracking-caps-wide text-muted-text uppercase">
          {format(text.stepCounter, { current: stepIndex + 1, total })}
        </p>
        <ol aria-label={text.stepsLabel} className="m-0 flex list-none items-center p-0">
          {stepTitles.map((title, index) => (
            <li key={index} className={cx('flex items-center', index > 0 && 'flex-1')}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  data-done={index <= stepIndex}
                  className="h-0.5 min-w-1 flex-1 bg-line data-[done=true]:bg-res"
                />
              )}
              <StepDot
                number={index + 1}
                title={title}
                state={index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo'}
                onClick={() => onGoTo(index)}
              />
            </li>
          ))}
        </ol>
      </div>

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

const dotState = {
  todo: 'border-line bg-panel text-ink',
  done: 'border-res bg-panel text-res-text',
  current: 'border-ink bg-ink text-paper',
} as const;

function StepDot({
  number,
  title,
  state,
  onClick,
}: {
  number: number;
  title: string;
  state: keyof typeof dotState;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={format(text.stepButton, { number, title })}
      aria-current={state === 'current' ? 'step' : undefined}
      onClick={onClick}
      className={cx(
        'grid size-[30px] flex-none place-items-center rounded-full border-[1.5px] p-0 font-mono text-meta font-semibold transition-colors duration-(--duration-ui)',
        dotState[state],
      )}
    >
      {number}
    </button>
  );
}
