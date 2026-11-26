import messages from '@messages/en.json';
import { Button } from '@/components/ui';
import { cx } from '@/lib/cx';

const text = messages.player;

export interface PlayerControlsProps {
  isPaused: boolean;
  /** Under reduced motion nothing animates, so there is nothing to pause. */
  reducedMotion?: boolean;
  onReplay: () => void;
  onTogglePause: () => void;
  className?: string;
}

/** Replay and Pause or Resume, the two controls for the step that is playing. */
export function PlayerControls({
  isPaused,
  reducedMotion = false,
  onReplay,
  onTogglePause,
  className,
}: PlayerControlsProps) {
  return (
    <div role="group" aria-label={text.controlsLabel} className={cx('flex gap-2', className)}>
      <Button size="sm" onClick={onReplay}>
        {text.replay}
      </Button>
      <Button size="sm" onClick={onTogglePause} disabled={reducedMotion}>
        {isPaused ? text.resume : text.pause}
      </Button>
    </div>
  );
}
