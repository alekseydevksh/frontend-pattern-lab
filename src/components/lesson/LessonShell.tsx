'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card, Pill } from '@/components/ui';
import type { AnyLesson, AnySceneDefinition } from '@/engine/types';
import { useLessonPlayer } from '@/engine/useLessonPlayer';
import { format } from '@/lib/format';
import { progressFor, saveStep, takeawaysUpTo } from '@/lib/progress';
import { useProgress } from '@/lib/useProgress';
import messages from '@messages/en.json';
import { Diagram } from './Diagram';
import { LESSON_TITLE_ID } from './LessonHeader';
import { MetricsRow } from './MetricsRow';
import { PlayerControls } from './PlayerControls';
import { StepCard } from './StepCard';
import { StepControls } from './StepControls';
import { Stepper } from './Stepper';
import { Takeaways } from './Takeaways';
import { useStepInUrl } from './useStepInUrl';
import { VerdictTable } from './VerdictTable';

/** What marks an invisible copy that is only there to take up room. */
const hiddenCopy = { 'aria-hidden': true, inert: true, 'data-table-sizer': '' } as const;

export interface LessonShellProps {
  lesson: AnyLesson;
  /**
   * The scene to draw: the one the scene registry holds for `lesson.sceneId`. The page loads it
   * (the shell does not import the registry), so a page carries only its own lesson's scene.
   */
  scene: AnySceneDefinition;
  /** The lesson's heading, breadcrumb and chips, rendered by the page (see `LessonHeader`). */
  header: ReactNode;
  /**
   * The lesson that follows this one, if there is one. On the last step the button says
   * "Next lesson: <title> →" and the right arrow does the same; `onOpen` goes there. Without it
   * the last step offers to restart the lesson.
   */
  nextLesson?: { title: string; onOpen: () => void };
}

/**
 * The lesson page body: a stage card with the header, the three metrics, the diagram and the
 * step dots, and beside it the step card and the checklist of what the lesson teaches. It runs
 * `useLessonPlayer`, so it is a client component; the static header text is passed in from
 * the server instead of being rendered here. Pass a `key` where one page can show different
 * lessons.
 *
 * On a step with a `summary`, a verdict table takes the place of the diagram.
 *
 * It also keeps the address (`?step=N`) and the saved progress (`localStorage`) in step with the
 * player. Both are applied after hydration, so the server HTML is always the plain first step.
 */
export function LessonShell({ lesson, scene, header, nextLesson }: LessonShellProps) {
  const player = useLessonPlayer(lesson, scene, { onPastEnd: nextLesson?.onOpen });
  const { step, stepIndex, stepCount } = player;
  const isLast = stepIndex === stepCount - 1;
  const summarySteps = useMemo(() => lesson.steps.filter((s) => s.summary), [lesson]);

  useStepInUrl(stepIndex, stepCount, player.goTo);

  // Remember how far the learner got. Runs after render, so it never touches the server HTML.
  useEffect(() => saveStep(lesson, stepIndex), [lesson, stepIndex]);

  // The furthest step reached, so a takeaway stays ticked after going back. Takeaways ticked on
  // an earlier visit come from saved progress, which arrives after hydration.
  const [furthest, setFurthest] = useState(stepIndex);
  if (stepIndex > furthest) setFurthest(stepIndex);
  const progress = useProgress();
  const reached = useMemo(
    () =>
      new Set([
        ...takeawaysUpTo(lesson, furthest),
        ...(progressFor(progress, lesson)?.ticked ?? []),
      ]),
    [lesson, furthest, progress],
  );

  return (
    <div className="grid items-start gap-4 min-[921px]:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <Card as="section" aria-labelledby={LESSON_TITLE_ID}>
        {header}
        <div className="mb-3 flex flex-wrap items-start gap-2">
          <MetricsRow
            labels={lesson.metricLabels}
            metrics={player.metrics}
            className="min-w-[min(100%,280px)] flex-1"
          />
          <Pill>{messages.lesson.simulated}</Pill>
        </div>
        {/*
          The diagram, or on a summary step the verdict table in its place, in one grid cell. The
          table can be taller than the diagram (its rows wrap on a narrow screen), so an invisible
          copy of each summary table sits under the diagram: the box is as tall as the table on
          every step, and changing step moves nothing below it. The copy is hidden from sight,
          from assistive technology and from the keyboard, like the step card's (see StepCard).
        */}
        <div className="grid grid-cols-[minmax(0,1fr)]">
          {step.summary ? (
            <VerdictTable
              summary={step.summary}
              description={step.sceneAlt}
              viewBox={scene.viewBox}
              className="[grid-area:1/1]"
            />
          ) : (
            <>
              <Diagram
                scene={scene}
                state={player.state}
                packets={player.activePackets}
                paused={player.isPaused}
                label={step.sceneAlt}
                className="[grid-area:1/1]"
              />
              {summarySteps.map((summaryStep) => (
                <VerdictTable
                  key={summaryStep.id}
                  summary={summaryStep.summary!}
                  description={summaryStep.sceneAlt}
                  viewBox={scene.viewBox}
                  className="pointer-events-none invisible [grid-area:1/1]"
                  {...hiddenCopy}
                />
              ))}
            </>
          )}
        </div>
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
        <StepCard step={step} stepIndex={stepIndex} stepCount={stepCount} reserveFor={lesson.steps}>
          <StepControls
            stepIndex={stepIndex}
            stepCount={stepCount}
            nextTitle={step.shortTitle}
            reserveFor={lesson.steps.map((s) => s.shortTitle)}
            finalLabel={
              nextLesson
                ? format(messages.player.nextLesson, { title: nextLesson.title })
                : undefined
            }
            onBack={player.back}
            onNext={isLast ? (nextLesson?.onOpen ?? (() => player.goTo(0))) : player.next}
          />
        </StepCard>
        <Takeaways items={lesson.takeaways} reached={reached} />
      </div>
    </div>
  );
}
