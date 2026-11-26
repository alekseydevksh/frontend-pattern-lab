'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { scenes } from '@/components/scenes/registry';
import { Card } from '@/components/ui';
import type { AnyLesson, AnySceneDefinition } from '@/engine/types';
import { useLessonPlayer } from '@/engine/useLessonPlayer';
import { format } from '@/lib/format';
import messages from '@messages/en.json';
import { Diagram } from './Diagram';
import { LESSON_TITLE_ID } from './LessonHeader';
import { MetricsRow } from './MetricsRow';
import { PlayerControls } from './PlayerControls';
import { StepCard } from './StepCard';
import { StepControls } from './StepControls';
import { Stepper } from './Stepper';
import { Takeaways } from './Takeaways';
import { VerdictTable } from './VerdictTable';

export interface LessonShellProps {
  lesson: AnyLesson;
  /** The scene to draw. Defaults to the one in the scene registry for `lesson.sceneId`. */
  scene?: AnySceneDefinition;
  /** The lesson's heading, breadcrumb and chips, rendered by the page (see `LessonHeader`). */
  header: ReactNode;
}

/**
 * The lesson page body: a stage card with the header, the three metrics, the diagram and the
 * step dots, and beside it the step card and the checklist of what the lesson teaches. It runs
 * `useLessonPlayer`, so it is a client component; the static header text is passed in from
 * the server instead of being rendered here. Pass a `key` where one page can show different
 * lessons.
 *
 * On a step with a `summary`, a verdict table takes the place of the diagram.
 */
export function LessonShell({ lesson, scene: sceneOverride, header }: LessonShellProps) {
  const scene = sceneOverride ?? scenes[lesson.sceneId];
  if (!scene) throw new Error(`Lesson "${lesson.slug}" has no scene "${lesson.sceneId}".`);

  const player = useLessonPlayer(lesson, scene);
  const { step, stepIndex, stepCount } = player;
  const isLast = stepIndex === stepCount - 1;

  // The furthest step reached, so a takeaway stays ticked after going back.
  const [furthest, setFurthest] = useState(stepIndex);
  if (stepIndex > furthest) setFurthest(stepIndex);
  const reached = useMemo(
    () => new Set(lesson.steps.slice(0, furthest + 1).map((s) => s.takeawayIndex)),
    [lesson.steps, furthest],
  );

  return (
    <div className="grid items-start gap-4 min-[921px]:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <Card as="section" aria-labelledby={LESSON_TITLE_ID}>
        {header}
        <MetricsRow labels={lesson.metricLabels} metrics={player.metrics} className="mb-3" />
        {step.summary ? (
          <VerdictTable
            summary={step.summary}
            description={step.sceneAlt}
            viewBox={scene.viewBox}
          />
        ) : (
          <Diagram
            scene={scene}
            state={player.state}
            packets={player.activePackets}
            paused={player.isPaused}
            label={step.sceneAlt}
          />
        )}
        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-label font-medium tracking-caps-wide text-muted-text uppercase">
              {format(messages.player.stepCounter, { current: stepIndex + 1, total: stepCount })}
            </p>
            <PlayerControls
              isPaused={player.isPaused}
              reducedMotion={player.reducedMotion}
              onReplay={player.replay}
              onTogglePause={player.togglePause}
            />
          </div>
          <Stepper
            stepIndex={stepIndex}
            stepTitles={lesson.steps.map((s) => s.title)}
            onGoTo={player.goTo}
          />
        </div>
      </Card>

      <div className="flex min-w-0 flex-col gap-4">
        <StepCard step={step} stepIndex={stepIndex} stepCount={stepCount}>
          <StepControls
            stepIndex={stepIndex}
            stepCount={stepCount}
            nextTitle={step.shortTitle}
            onBack={player.back}
            onNext={isLast ? () => player.goTo(0) : player.next}
          />
        </StepCard>
        <Takeaways items={lesson.takeaways} reached={reached} />
      </div>
    </div>
  );
}
