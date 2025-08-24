import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import QuoteGenerator from '@components/apps/quote_generator';

jest.mock('@components/apps/quotes.json', () => [
  { quote: 'Life is a journey', author: 'Alice' },
  { quote: 'Technology improves life', author: 'Bob' },
]);

jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

// Provide matchMedia mock to avoid errors and prefer reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

describe('QuoteGenerator', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ quotes: [] }),
      headers: { get: () => null },
    }) as any;
  });

  it('skips fetch when rate limit active', async () => {
    localStorage.setItem('quotesFetchedAt', Date.now().toString());
    render(<QuoteGenerator />);
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled());
  });

  it('manual refresh bypasses rate limit', async () => {
    localStorage.setItem('quotesFetchedAt', Date.now().toString());
    render(<QuoteGenerator />);
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it('filters by tag', async () => {
    render(<QuoteGenerator />);
    fireEvent.change(screen.getByTestId('tag-filter'), { target: { value: 'technology' } });
    await waitFor(() =>
      expect(screen.getByText(/Technology improves life/)).toBeInTheDocument()
    );
  });
});
