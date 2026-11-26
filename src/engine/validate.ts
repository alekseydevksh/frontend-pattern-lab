import type { AnyLesson, AnySceneDefinition } from './types';

/**
 * Checks lesson data against the rules in "Content validation test" in docs/SPEC.md, and
 * returns one readable message per problem (an empty list means the lessons are valid).
 *
 * It knows nothing about any one lesson. The test in content/lessons runs it over the real
 * registry, so a mistake in lesson data fails the build.
 */
export function validateLessons(
  lessons: readonly AnyLesson[],
  scenes: Readonly<Record<string, AnySceneDefinition>>,
): string[] {
  const problems: string[] = [];

  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const lesson of lessons) {
    if (slugs.has(lesson.slug)) problems.push(`Lesson slug "${lesson.slug}" is used twice.`);
    slugs.add(lesson.slug);
    if (orders.has(lesson.order)) problems.push(`Lesson order ${lesson.order} is used twice.`);
    orders.add(lesson.order);
    problems.push(...validateLesson(lesson, scenes));
  }
  return problems;
}

export function validateLesson(
  lesson: AnyLesson,
  scenes: Readonly<Record<string, AnySceneDefinition>>,
): string[] {
  const problems: string[] = [];
  const where = `Lesson "${lesson.slug}"`;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(lesson.slug)) {
    problems.push(`${where}: the slug must be lower-case words joined by hyphens.`);
  }
  if (isBlank(lesson.title)) problems.push(`${where}: the title is empty.`);

  // A coming-soon lesson is a catalog entry only: it has no steps and no scene to check.
  if (lesson.status === 'coming-soon') {
    if (lesson.steps.length > 0)
      problems.push(`${where}: a coming-soon lesson must have no steps.`);
    return problems;
  }

  if (lesson.steps.length === 0) problems.push(`${where}: a published lesson needs steps.`);
  if (lesson.takeaways.length === 0) problems.push(`${where}: it has no takeaways.`);
  lesson.takeaways.forEach((takeaway, i) => {
    if (isBlank(takeaway)) problems.push(`${where}: takeaway ${i} is empty.`);
  });

  const scene = scenes[lesson.sceneId];
  if (!scene) {
    problems.push(`${where}: sceneId "${lesson.sceneId}" is not in the scene registry.`);
  }

  const ids = new Set<string>();
  const ticked = new Set<number>();
  lesson.steps.forEach((step, stepIndex) => {
    const at = `${where}, step ${stepIndex + 1} ("${step.id}")`;

    if (ids.has(step.id)) problems.push(`${at}: the step id is used twice.`);
    ids.add(step.id);

    if (isBlank(step.id)) problems.push(`${at}: the step id is empty.`);
    if (isBlank(step.title)) problems.push(`${at}: the title is empty.`);
    if (isBlank(step.keyIdea)) problems.push(`${at}: the key idea is empty.`);
    if (step.body.length === 0 || step.body.some(isBlank)) {
      problems.push(`${at}: the body needs at least one paragraph, and none may be empty.`);
    }
    // The last step has no "Next: ..." button, so only the others need a short title.
    if (stepIndex < lesson.steps.length - 1 && isBlank(step.shortTitle)) {
      problems.push(`${at}: the short title is empty, and the "Next" button shows it.`);
    }
    if (isBlank(step.sceneAlt)) problems.push(`${at}: sceneAlt is empty.`);

    const tickIndex = step.takeawayIndex;
    if (!Number.isInteger(tickIndex) || tickIndex < 0 || tickIndex >= lesson.takeaways.length) {
      problems.push(
        `${at}: takeawayIndex ${tickIndex} is out of range (the lesson has ${lesson.takeaways.length} takeaways).`,
      );
    } else {
      ticked.add(tickIndex);
    }

    let previous = 0;
    step.frames.forEach((frame, frameIndex) => {
      const frameAt = `${at}, frame ${frameIndex + 1}`;
      if (!Number.isFinite(frame.at) || frame.at < 0) {
        problems.push(`${frameAt}: "at" must be a number of milliseconds, zero or more.`);
        return;
      }
      if (frame.at < previous) {
        problems.push(
          `${frameAt}: frames must be sorted by "at", but ${frame.at} comes after ${previous}.`,
        );
      }
      previous = Math.max(previous, frame.at);

      if (frame.packet && scene && !scene.lanes[frame.packet.lane]) {
        const known = Object.keys(scene.lanes).join(', ') || 'none';
        problems.push(
          `${frameAt}: the packet uses lane "${frame.packet.lane}", which scene "${lesson.sceneId}" does not define (it has: ${known}).`,
        );
      }
    });
  });

  // A takeaway no step ticks could never be completed.
  lesson.takeaways.forEach((_, i) => {
    if (!ticked.has(i)) problems.push(`${where}: no step ticks takeaway ${i}.`);
  });

  return problems;
}

function isBlank(value: string): boolean {
  return typeof value !== 'string' || value.trim() === '';
}
