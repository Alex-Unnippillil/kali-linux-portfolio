import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockPlaylists = [
  {
    id: 'alpha',
    title: 'Alpha Recon',
    description: 'Recon techniques playlist',
    thumbnail: 'alpha.jpg',
    channelTitle: 'CyberSec Lab',
    channelId: 'cyber',
    itemCount: 12,
    updatedAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'zero',
    title: 'Zero Day Tutorials',
    description: 'Deep dives on zero-day research',
    thumbnail: 'zero.jpg',
    channelTitle: 'Red Team Academy',
    channelId: 'red',
    itemCount: 18,
    updatedAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'blue',
    title: 'Blue Team Basics',
    description: 'Defensive techniques refresher',
    thumbnail: 'blue.jpg',
    channelTitle: 'CyberSec Lab',
    channelId: 'cyber',
    itemCount: 8,
    updatedAt: '2023-12-01T00:00:00Z',
  },
];

const getRenderedTitles = () =>
  screen
    .getAllByRole('heading', { level: 3 })
    .map((element) => element.textContent?.trim())
    .filter(Boolean);

describe('YouTube playlists explorer', () => {
  it('renders initial playlists with metadata', () => {
    render(<YouTubeApp initialResults={mockPlaylists} />);

    mockPlaylists.forEach((playlist) => {
      expect(screen.getByText(playlist.title)).toBeInTheDocument();
      expect(screen.getAllByText(playlist.channelTitle)[0]).toBeInTheDocument();
      expect(screen.getByText(`${playlist.itemCount} videos`)).toBeInTheDocument();
    });
  });

  it('filters playlists by channel selection', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockPlaylists} />);

    await user.click(screen.getByRole('button', { name: /Red Team Academy/ }));

    expect(screen.getByText('Zero Day Tutorials')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Recon')).not.toBeInTheDocument();
    expect(screen.queryByText('Blue Team Basics')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear channel filter/i })).toBeInTheDocument();
  });

  it('sorts playlists by title when toggled', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockPlaylists} />);

    await user.click(screen.getByRole('button', { name: 'Title A → Z' }));
    await waitFor(() => {
      expect(getRenderedTitles()).toEqual([
        'Alpha Recon',
        'Blue Team Basics',
        'Zero Day Tutorials',
      ]);
    });

    await user.click(screen.getByRole('button', { name: 'Title Z → A' }));
    await waitFor(() => {
      expect(getRenderedTitles()).toEqual([
        'Zero Day Tutorials',
        'Blue Team Basics',
        'Alpha Recon',
      ]);
    });
  });

  it('switches to channel groups layout', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockPlaylists} />);

    await user.click(screen.getByRole('button', { name: 'Group by channel' }));

    expect(screen.getByRole('heading', { name: 'CyberSec Lab' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Red Team Academy' })).toBeInTheDocument();
  });
});
