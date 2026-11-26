import { describe, expect, it } from 'vitest';
import { pageMetadata } from './metadata';

describe('pageMetadata', () => {
  it('gives a page its title, description, canonical path and Open Graph fields', () => {
    const meta = pageMetadata({
      title: 'Optimistic UI',
      description: 'Update first.',
      path: '/lessons/optimistic-ui/',
    });
    expect(meta.title).toEqual({ absolute: 'Optimistic UI · Frontend Pattern Lab' });
    expect(meta.description).toBe('Update first.');
    expect(meta.alternates?.canonical).toBe('/lessons/optimistic-ui/');
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Frontend Pattern Lab',
      title: 'Optimistic UI · Frontend Pattern Lab',
      description: 'Update first.',
      url: '/lessons/optimistic-ui/',
    });
  });

  it('uses the bare site name on the catalog, which has no page title of its own', () => {
    const meta = pageMetadata({ description: 'All lessons.', path: '/' });
    expect(meta.title).toEqual({ absolute: 'Frontend Pattern Lab' });
    expect(meta.openGraph).toMatchObject({ title: 'Frontend Pattern Lab', url: '/' });
  });
});
