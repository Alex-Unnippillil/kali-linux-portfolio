import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import QuoteGenerator from '../components/apps/quote_generator';

describe('QuoteGenerator favorites', () => {
  beforeEach(() => {
    localStorage.clear();
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.reject(new Error('network')));
  });

  it('toggles favorites and persists them', async () => {
    render(<QuoteGenerator />);
    const favButton = await screen.findByRole('button', { name: /favorite/i });
    expect(JSON.parse(localStorage.getItem('favoriteQuotes') || '[]')).toHaveLength(0);

    fireEvent.click(favButton);
    expect(JSON.parse(localStorage.getItem('favoriteQuotes') || '[]')).toHaveLength(1);
    expect(favButton.textContent).toMatch(/unfavorite/i);

    fireEvent.click(favButton);
    await waitFor(() => expect(favButton.textContent).toMatch(/favorite/i));
    expect(JSON.parse(localStorage.getItem('favoriteQuotes') || '[]')).toHaveLength(0);
  });
});
