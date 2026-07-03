import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyApp from '../components/apps/spotify';

describe('SpotifyApp', () => {
  it('renders embed for valid public url', async () => {
    const user = userEvent.setup();
    render(<SpotifyApp />);
    await user.selectOptions(screen.getByTestId('type-select'), 'track');
    await user.type(screen.getByTestId('url-input'), 'https://open.spotify.com/track/123');
    await user.click(screen.getByTestId('load-btn'));
    const iframe = screen.getByTestId('spotify-embed');
    expect(iframe).toHaveAttribute('src', 'https://open.spotify.com/embed/track/123');
  });

  it('shows error for invalid url', async () => {
    const user = userEvent.setup();
    render(<SpotifyApp />);
    await user.type(screen.getByTestId('url-input'), 'https://example.com');
    await user.click(screen.getByTestId('load-btn'));
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid or private url/i);
  });

  it('allows drag reorder in playlist builder', async () => {
    const user = userEvent.setup();
    render(<SpotifyApp />);
    await user.type(screen.getByTestId('track-input'), 'https://open.spotify.com/track/1');
    await user.click(screen.getByTestId('add-track'));
    await user.type(screen.getByTestId('track-input'), 'https://open.spotify.com/track/2');
    await user.click(screen.getByTestId('add-track'));
    const items = screen.getAllByTestId('track-item');
    fireEvent.dragStart(items[0]);
    fireEvent.dragOver(items[1]);
    fireEvent.drop(items[1]);
    const reordered = screen.getAllByTestId('track-item').map((el) => el.textContent);
    expect(reordered[0]).toBe('https://open.spotify.com/track/2');
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<SpotifyApp />);
    await user.selectOptions(screen.getByTestId('type-select'), 'track');
    await user.type(screen.getByTestId('url-input'), 'https://open.spotify.com/track/123');
    await user.click(screen.getByTestId('load-btn'));

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByTestId('status')).toHaveTextContent('Playing');

    fireEvent.keyDown(window, { key: 'l' });
    expect(screen.getByTestId('time')).toHaveTextContent('10');

    fireEvent.keyDown(window, { key: 'j' });
    expect(screen.getByTestId('time')).toHaveTextContent('0');

    fireEvent.keyDown(window, { key: 's' });
    expect(screen.getByTestId('muted')).toHaveTextContent('true');
  });
});
