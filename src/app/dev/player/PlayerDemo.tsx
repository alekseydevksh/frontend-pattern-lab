'use client';

import messages from '@messages/en.json';
import { dummyLesson } from '@content/dev/dummy-lesson';
import { Diagram } from '@/components/lesson/Diagram';
import { PlayerControls } from '@/components/lesson/PlayerControls';
import { StepControls } from '@/components/lesson/StepControls';
import { dummyScene } from '@/components/scenes/dev/DummyScene';
import { Card, Chip, MetricTile, Pill } from '@/components/ui';
import { useLessonPlayer } from '@/engine/useLessonPlayer';
import { format } from '@/lib/format';

const text = messages.playerTest;
const lesson = dummyLesson;

/**
 * The player test page: the dummy lesson, played by the real engine and the real controls.
 * It is the smallest page that uses the whole pipeline (lesson data, player, scene) and is
 * what the end-to-end test drives with the keyboard. The lesson shell of M4 will replace it.
 */
export function PlayerDemo() {
  const player = useLessonPlayer(lesson, dummyScene);
  const { step } = player;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <Card as="section" aria-labelledby="lesson-title" className="flex flex-col gap-3">
        <div>
          <h1
            id="lesson-title"
            className="font-display text-h1 font-extrabold tracking-tight text-balance"
          >
            {lesson.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip>{format(text.lessonMeta, { minutes: lesson.minutes, level: lesson.level })}</Chip>
          </div>
          <p className="mt-3 max-w-[64ch] text-muted-text">{lesson.summary}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {player.metrics.map((metric, i) => (
            <MetricTile
              key={lesson.metricLabels[i]}
              label={lesson.metricLabels[i] ?? ''}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </div>

        <Diagram
          scene={dummyScene}
          state={player.state}
          packets={player.activePackets}
          paused={player.isPaused}
          label={step.sceneAlt}
        />

        <PlayerControls
          className="self-end"
          isPaused={player.isPaused}
          reducedMotion={player.reducedMotion}
          onReplay={player.replay}
          onTogglePause={player.togglePause}
        />
      </Card>

      <Card as="section" aria-label={text.title} className="flex flex-col gap-4">
        <div aria-live="polite" className="flex flex-col gap-3">
          <div>
            <Pill tone={step.tone}>{step.tag}</Pill>
          </div>
          <h2 className="font-display text-h2 font-extrabold tracking-tight text-balance">
            {step.title}
          </h2>
          {step.body.map((paragraph) => (
            <p key={paragraph} className="max-w-[60ch]">
              {paragraph}
            </p>
          ))}
          <p className="rounded-r-field border-l-4 border-ev bg-[color-mix(in_srgb,var(--ev)_10%,transparent)] px-3.5 py-2.5">
            <span className="mb-0.5 block font-mono text-micro font-semibold tracking-caps-wide text-ev-text uppercase">
              {text.keyIdea}
            </span>
            {step.keyIdea}
          </p>
        </div>

        <StepControls
          stepIndex={player.stepIndex}
          stepTitles={lesson.steps.map((s) => s.title)}
          nextTitle={step.shortTitle}
          onGoTo={player.goTo}
          onBack={player.back}
          onNext={player.stepIndex === player.stepCount - 1 ? () => player.goTo(0) : player.next}
        />
      </Card>
    </div>
  );
}
