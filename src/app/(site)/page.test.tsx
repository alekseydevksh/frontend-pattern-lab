import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { catalog } from '@content/lessons/catalog';
import CatalogPage, { metadata } from './page';

describe('CatalogPage', () => {
  it('renders the heading and a card for every one of the twelve lessons', () => {
    render(<CatalogPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Frontend Pattern Lab' })).toBeTruthy();
    for (const entry of catalog) {
      expect(screen.getByRole('heading', { level: 3, name: entry.title })).toBeTruthy();
    }
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  it('links the ready lessons and marks the others coming soon, without a link', () => {
    render(<CatalogPage />);
    expect(screen.getByRole('link', { name: 'Optimistic UI' }).getAttribute('href')).toBe(
      '/lessons/optimistic-ui',
    );
    expect(screen.getAllByText('Coming soon')).toHaveLength(10);
    expect(screen.queryByRole('link', { name: 'Virtualization' })).toBeNull();
  });

  it('groups the lessons into four tracks', () => {
    render(<CatalogPage />);
    const tracks = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(tracks).toEqual([
      'Data and state',
      'Rendering and performance',
      'Structure',
      'Product reliability',
    ]);
    const structure = screen.getByRole('region', { name: 'Structure' });
    expect(within(structure).getAllByRole('article')).toHaveLength(2);
  });

  it('says how many lessons are ready', () => {
    render(<CatalogPage />);
    expect(screen.getByText('2 of 12 lessons are ready. The rest are on their way.')).toBeTruthy();
  });

  it('has its own title, description and canonical address', () => {
    expect(metadata.title).toEqual({ absolute: 'Frontend Pattern Lab' });
    expect(metadata.alternates?.canonical).toBe('/');
  });
});
