import messages from '@messages/en.json';
import { cx } from '@/lib/cx';
import { format } from '@/lib/format';

const text = messages.player;

export interface StepperProps {
  /** Zero-based index of the step that is showing. */
  stepIndex: number;
  /** The title of every step, in order. Its length is the number of steps. */
  stepTitles: readonly string[];
  onGoTo: (index: number) => void;
  className?: string;
}

/**
 * A numbered dot for each step, joined by a line that fills as steps are passed. Native
 * buttons: the current step's dot has `aria-current="step"`, and every dot's name carries the
 * step's title. Pressing the current dot starts that step over.
 */
export function Stepper({ stepIndex, stepTitles, onGoTo, className }: StepperProps) {
  return (
    <ol
      aria-label={text.stepsLabel}
      className={cx('m-0 flex list-none items-center p-0', className)}
    >
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
