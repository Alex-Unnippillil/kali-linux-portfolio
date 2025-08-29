import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: 'a',
    title: 'Video A',
    thumbnail: 'a.jpg',
    channelName: 'Chan A',
    channelId: 'chanA',
  },
  {
    id: 'b',
    title: 'Video B',
    thumbnail: 'b.jpg',
    channelName: 'Chan B',
    channelId: 'chanB',
  },
];

describe('YouTube search app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads video when thumbnail clicked', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('a'));
  });

  it('adds to queue and watch later lists', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const queueButtons = screen.getAllByRole('button', { name: 'Queue' });
    const laterButtons = screen.getAllByRole('button', { name: 'Later' });
    await user.click(queueButtons[0]);
    await user.click(laterButtons[0]);

    expect(
      within(screen.getByTestId('queue-list')).getByText('Video A')
    ).toBeInTheDocument();
    const stored = JSON.parse(
      window.localStorage.getItem('youtube:watch-later') || '[]'
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('a');
  });
});

