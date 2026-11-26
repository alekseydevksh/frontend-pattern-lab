import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { catalog } from '@content/lessons/catalog';
import { lessonPages } from '@/components/scenes/registry';
import { lessonMetadata, lessonPage } from './lessonPage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const firstSoon = catalog.find((e) => e.status === 'soon');

describe('a lesson page', () => {
  it.each(lessonPages.map((p) => [p.folder, p] as const))(
    '%s draws its own lesson with its own scene',
    (_folder, { lesson, scene }) => {
      const Page = lessonPage(lesson, scene);
      const { unmount } = render(<Page />);
      const main = screen.getByRole('main');
      expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(lesson.title);
      const diagram = within(main).getByRole('img', { name: lesson.steps[0]!.sceneAlt });
      expect(diagram.getAttribute('viewBox')).toBe(scene.viewBox);
      unmount();
    },
  );

  it('takes its title, summary and address from the catalog', () => {
    const { lesson } = lessonPages[0]!;
    const metadata = lessonMetadata(lesson);
    expect(String((metadata.title as { absolute: string }).absolute)).toContain(lesson.title);
    expect(metadata.description).toBe(lesson.summary);
    expect(metadata.alternates?.canonical).toBe(`/lessons/${lesson.slug}/`);
  });

  it('fails the build for a lesson whose catalog entry is not ready', () => {
    const { lesson, scene } = lessonPages[0]!;
    const notReady = { ...lesson, slug: firstSoon?.slug ?? 'missing' };
    expect(() => lessonPage(notReady, scene)).toThrow(/is not ready/);
    expect(() => lessonMetadata(notReady)).toThrow(/is not ready/);
  });
});
