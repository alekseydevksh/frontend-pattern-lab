import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { catalog, readyEntries } from '@content/lessons/catalog';
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
    expect(screen.getAllByText('Coming soon')).toHaveLength(12 - readyEntries.length);
    const firstSoon = catalog.find((entry) => entry.status === 'soon')!;
    expect(screen.queryByRole('link', { name: firstSoon.title })).toBeNull();
  });

  it('is one list in lesson order, numbered 1 to 12 without a gap', () => {
    render(<CatalogPage />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
    const articles = screen.getAllByRole('article');
    expect(articles.map((a) => within(a).getByRole('heading').textContent)).toEqual(
      catalog.map((entry) => entry.title),
    );
    expect(articles.map((a) => /Lesson (\d+)/.exec(a.textContent ?? '')?.[1])).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
    // The numbers a sighted visitor sees are the same, padded.
    expect(articles.map((a) => a.querySelector('[aria-hidden="true"]')?.textContent)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    );
  });

  it('does not group by track: the only section heading is the hidden list title', () => {
    render(<CatalogPage />);
    const sections = screen.getAllByRole('heading', { level: 2 });
    expect(sections.map((h) => h.textContent)).toEqual(['All lessons']);
    expect(screen.queryByRole('region', { name: 'Structure' })).toBeNull();
  });

  it('shows the track as a label on every card, ready or not', () => {
    render(<CatalogPage />);
    const articles = screen.getAllByRole('article');
    articles.forEach((article, index) => {
      expect(within(article).getByText(catalog[index]!.track), catalog[index]!.slug).toBeTruthy();
    });
    const virtualization = articles[2]!;
    expect(virtualization.textContent).toContain('Track: Rendering and performance');
  });

  it('says how long each ready lesson is, from the catalog entries alone', () => {
    render(<CatalogPage />);
    const optimistic = screen.getAllByRole('article')[0]!;
    expect(within(optimistic).getByText('4 min')).toBeTruthy();
    expect(within(optimistic).getByText('6 steps')).toBeTruthy();
    const pushPull = screen.getAllByRole('article')[1]!;
    expect(within(pushPull).getByText('5 min')).toBeTruthy();
    expect(within(pushPull).getByText('7 steps')).toBeTruthy();
  });

  it('says how many lessons are ready', () => {
    render(<CatalogPage />);
    expect(
      screen.getByText(
        `${readyEntries.length} of 12 lessons are ready. The rest are on their way.`,
      ),
    ).toBeTruthy();
  });

  it('has its own title, description and canonical address', () => {
    expect(metadata.title).toEqual({ absolute: 'Frontend Pattern Lab' });
    expect(metadata.alternates?.canonical).toBe('/');
  });
});
