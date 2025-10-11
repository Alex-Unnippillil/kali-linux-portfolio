import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Firefox from '../components/apps/firefox';

describe('Firefox app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the default address inside the iframe shell', () => {
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/docs/');
    expect(screen.getByTitle('Firefox')).toHaveAttribute('src', 'https://www.kali.org/docs/');
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

  it('restores the previous address on mount', () => {
    localStorage.setItem('firefox:last-url', 'https://www.kali.org/blog/');
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/blog/');
    expect(screen.getByTitle('Firefox')).toHaveAttribute('src', 'https://www.kali.org/blog/');
  });

  it('consumes staged start URLs from session storage', () => {
    sessionStorage.setItem('firefox:start-url', 'forums.kali.org');
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://forums.kali.org/');
    expect(localStorage.getItem('firefox:last-url')).toBe('https://forums.kali.org/');
    expect(sessionStorage.getItem('firefox:start-url')).toBeNull();
  });
});
