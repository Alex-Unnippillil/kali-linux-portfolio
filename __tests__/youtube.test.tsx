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

  it('allows sorting after switching categories', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);

    // Filter to a category with multiple videos then change sort order
    await user.click(screen.getByRole('button', { name: 'Dev' }));
    const getTitles = () =>
      screen.getAllByRole('link').map((a) => a.textContent);

    // Initial order should be newest first
    expect(getTitles()).toEqual(['React Tutorial', 'Advanced React']);

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'title');
    expect(getTitles()).toEqual(['Advanced React', 'React Tutorial']);
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

  it('handles videos missing metadata when sorting', async () => {
    const user = userEvent.setup();
    const videosWithMissing = [
      ...mockVideos,
      { id: '4', thumbnail: 'thumb4.jpg', url: 'https://youtu.be/4' },
    ];
    render(<YouTubeApp initialVideos={videosWithMissing} />);
    const select = screen.getByLabelText(/sort by/i);

    await user.selectOptions(select, 'title');
    expect(screen.getAllByTestId('video-card')).toHaveLength(4);

    await user.selectOptions(select, 'playlist');
    expect(screen.getAllByTestId('video-card')).toHaveLength(4);

    await user.selectOptions(select, 'date');
    expect(screen.getAllByTestId('video-card')).toHaveLength(4);
  });

  it('renders videos with missing properties without crashing', () => {
    const incomplete = [{ id: '5', url: 'https://youtu.be/5' }];
    render(<YouTubeApp initialVideos={incomplete} />);
    expect(screen.getAllByTestId('video-card')).toHaveLength(1);
  });

  it('category buttons include transition-colors class', () => {
    render(<YouTubeApp initialVideos={mockVideos} />);
    screen
      .getAllByRole('button')
      .forEach((btn) => expect(btn).toHaveClass('transition-colors'));
  });

  it('video cards include transition class', () => {
    render(<YouTubeApp initialVideos={mockVideos} />);
    screen
      .getAllByTestId('video-card')
      .forEach((card) => expect(card).toHaveClass('transition'));
  });

  it('memoizes categories and sorted lists between renders', async () => {
    jest.resetModules();
    const calls = [];
    jest.doMock('react', () => {
      const actual = jest.requireActual('react');
      return {
        ...actual,
        useMemo: (fn, deps) => {
          const wrapped = jest.fn(fn);
          calls.push(wrapped);
          return actual.useMemo(wrapped, deps);
        },
      };
    });

    const ReactTesting = await import('@testing-library/react/pure');
    const { default: MemoApp } = await import('../components/apps/youtube');
    const { rerender, unmount } = ReactTesting.render(
      <MemoApp initialVideos={mockVideos} />
    );

    // categories (index 0) and sorted (index 2) should have executed once
    expect(calls[0]).toHaveBeenCalledTimes(1);
    expect(calls[2]).toHaveBeenCalledTimes(1);

    rerender(<MemoApp initialVideos={mockVideos} />);
    expect(calls[0]).toHaveBeenCalledTimes(1);
    expect(calls[2]).toHaveBeenCalledTimes(1);

    unmount();
    jest.resetModules();
  });
  it('fetches videos from multiple playlists via Promise.all', async () => {
    const responses = {
      channel: { items: [{ id: 'chan' }] },
      playlists: {
        items: [
          { id: 'pl1', snippet: { title: 'PL1' } },
          { id: 'pl2', snippet: { title: 'PL2' } },
        ],
      },
      pl1: {
        items: [
          {
            snippet: {
              resourceId: { videoId: 'a' },
              title: 'Video A',
              publishedAt: '2020-01-01T00:00:00Z',
              thumbnails: { medium: { url: 'a.jpg' } },
              channelTitle: 'x',
            },
          },
        ],
      },
      pl2: {
        items: [
          {
            snippet: {
              resourceId: { videoId: 'c' },
              title: 'Video C',
              publishedAt: '2020-03-01T00:00:00Z',
              thumbnails: { medium: { url: 'c.jpg' } },
              channelTitle: 'x',
            },
          },
        ],
      },
    };

    global.fetch = jest.fn((url) => {
      if (url.includes('channels'))
        return Promise.resolve({ json: () => responses.channel });
      if (url.includes('playlists?'))
        return Promise.resolve({ json: () => responses.playlists });
      if (url.includes('playlistItems')) {
        const u = new URL(url);
        const plId = u.searchParams.get('playlistId');
        const data = plId === 'pl1' ? responses.pl1 : responses.pl2;
        return new Promise((resolve) =>
          setTimeout(() => resolve({ json: () => data }), 10)
        );
      }
      return Promise.resolve({ json: () => ({}) });
    });

    render(<YouTubeApp />);

    const cards = await screen.findAllByTestId('video-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Video A')).toBeInTheDocument();
    expect(screen.getByText('Video C')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('playlistItems?part=snippet&playlistId=pl1')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('playlistItems?part=snippet&playlistId=pl2')
    );
  });
});
