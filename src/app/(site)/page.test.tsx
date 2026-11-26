import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import messages from '@messages/en.json';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the site heading from the message file', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: messages.home.heading })).toBeTruthy();
  });
});
