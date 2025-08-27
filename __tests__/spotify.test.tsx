import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyApp from '../components/apps/spotify';

describe('SpotifyApp', () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true });
  });

  it('renders embed for valid URL', async () => {
    render(<SpotifyApp />);
    await userEvent.type(
      screen.getByPlaceholderText(/enter spotify url/i),
      'https://open.spotify.com/playlist/123'
    );
    await userEvent.click(screen.getByRole('button', { name: /load/i }));
    const frame = await screen.findByTitle('Spotify');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute(
      'src',
      'https://open.spotify.com/embed/playlist/123'
    );
  });

  it('shows error for invalid URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<SpotifyApp />);
    await userEvent.type(
      screen.getByPlaceholderText(/enter spotify url/i),
      'https://open.spotify.com/playlist/private'
    );
    await userEvent.click(screen.getByRole('button', { name: /load/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not load spotify url/i);
    expect(screen.queryByTitle('Spotify')).not.toBeInTheDocument();
  });
});

