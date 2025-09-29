import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Firefox from '../components/apps/firefox';

describe('Firefox app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the default address with a simulation fallback', () => {
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/docs/');
    expect(screen.getByRole('heading', { name: 'Kali Linux Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open kali.org\/docs/i })).toHaveAttribute(
      'href',
      'https://www.kali.org/docs/'
    );
  });

  it('navigates to entered urls', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    await user.clear(input);
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    const frame = await screen.findByTitle('Firefox');
    expect(frame).toHaveAttribute('src', 'https://example.com/');
    expect(localStorage.getItem('firefox:last-url')).toBe('https://example.com/');
  });

  it('opens bookmarks when clicked and shows their simulations', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const bookmark = await screen.findByRole('button', { name: 'Kali NetHunter' });
    await user.click(bookmark);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Kali NetHunter & Downloads' })).toBeInTheDocument()
    );
    expect(localStorage.getItem('firefox:last-url')).toBe('https://www.kali.org/get-kali/#kali-platforms');
  });
});
