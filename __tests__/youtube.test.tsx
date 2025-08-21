import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: '1',
    title: 'React Tutorial',
    playlist: 'Dev',
    publishedAt: '2022-01-01T00:00:00Z',
    thumbnail: 'thumb1.jpg',
    url: 'https://youtu.be/1',
  },
  {
    id: '2',
    title: 'Cooking with React',
    playlist: 'Cook',
    publishedAt: '2022-02-01T00:00:00Z',
    thumbnail: 'thumb2.jpg',
    url: 'https://youtu.be/2',
  },
  {
    id: '3',
    title: 'Advanced React',
    playlist: 'Dev',
    publishedAt: '2021-06-01T00:00:00Z',
    thumbnail: 'thumb3.jpg',
    url: 'https://youtu.be/3',
  },
];

describe('YouTubeApp', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'test';
  });

  it('shows message when API key is missing', () => {
    delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    render(<YouTubeApp />);
    expect(
      screen.getByText(/YouTube API key is not configured/i)
    ).toBeInTheDocument();
  });

  it('renders video cards with thumbnail and metadata', () => {
    render(<YouTubeApp initialVideos={mockVideos} />);
    const cards = screen.getAllByTestId('video-card');
    expect(cards).toHaveLength(mockVideos.length);
    mockVideos.forEach((video) => {
      expect(screen.getByAltText(video.title)).toBeInTheDocument();
      expect(
        screen.getByText(
          `${video.playlist} • ${new Date(video.publishedAt).toLocaleDateString()}`
        )
      ).toBeInTheDocument();
    });
  });

  it('filters videos when switching tabs', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    expect(screen.getAllByTestId('video-card')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Dev' }));
    expect(screen.getAllByTestId('video-card')).toHaveLength(2);
    expect(screen.queryByText('Cooking with React')).not.toBeInTheDocument();
  });

  it('search input limits results by title', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    await user.type(screen.getByPlaceholderText(/search/i), 'Advanced');
    expect(screen.getAllByTestId('video-card')).toHaveLength(1);
    expect(screen.getByText('Advanced React')).toBeInTheDocument();
    expect(screen.queryByText('React Tutorial')).not.toBeInTheDocument();
  });

  it('sort options reorder videos', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    const getTitles = () =>
      screen.getAllByRole('link').map((a) => a.textContent);

    expect(getTitles()).toEqual([
      'Cooking with React',
      'React Tutorial',
      'Advanced React',
    ]);

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'title');
    expect(getTitles()).toEqual([
      'Advanced React',
      'Cooking with React',
      'React Tutorial',
    ]);
  });
});
