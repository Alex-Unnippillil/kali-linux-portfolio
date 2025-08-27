import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: '1',
    title: 'Alpha',
    playlist: 'Dev',
    publishedAt: '2023-01-01T00:00:00Z',
    thumbnail: 'thumb1.jpg',
    url: 'https://youtu.be/1',
  },
  {
    id: '2',
    title: 'Beta',
    playlist: 'Cook',
    publishedAt: '2022-01-01T00:00:00Z',
    thumbnail: 'thumb2.jpg',
    url: 'https://youtu.be/2',
  },
  {
    id: '3',
    title: 'Gamma',
    playlist: 'Dev',
    publishedAt: '2021-01-01T00:00:00Z',
    thumbnail: 'thumb3.jpg',
    url: 'https://youtu.be/3',
  },
];

describe('YouTubeApp', () => {
  it('filters videos by category', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);

    // all videos initially
    expect(screen.getAllByTestId('video-card')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Dev' }));
    expect(screen.getAllByTestId('video-card')).toHaveLength(2);
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('sorts videos by title when selected', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'title');
    const titles = screen
      .getAllByRole('link')
      .map((a) => a.textContent?.trim());
    expect(titles).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('lazily mounts the YouTube player', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);

    expect(screen.queryByTestId('player')).toBeNull();

    await user.click(screen.getAllByRole('link')[0]);
    const wrapper = await screen.findByTestId('player');
    expect(wrapper.querySelector('iframe')).toBeNull();
    await user.click(screen.getByText('Play'));
    expect(await screen.findByTitle('YouTube video')).toBeInTheDocument();
  });
});

