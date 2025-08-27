import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const loadApp = () => require('../components/apps/youtube').default;

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

  it('memoizes categories and sorted arrays', async () => {
    const YouTubeApp = loadApp();
    const categoriesRef = { current: null };
    const sortedRef = { current: null };
    const { rerender } = render(
      <YouTubeApp
        initialVideos={mockVideos}
        categoriesRef={categoriesRef}
        sortedRef={sortedRef}
      />
    );

    await screen.findAllByTestId('video-card');
    const firstCategories = categoriesRef.current;
    const firstSorted = sortedRef.current;

    rerender(
      <YouTubeApp
        initialVideos={mockVideos}
        categoriesRef={categoriesRef}
        sortedRef={sortedRef}
      />
    );

    expect(categoriesRef.current).toBe(firstCategories);
    expect(sortedRef.current).toBe(firstSorted);
  });

  it('shows message when API key is missing', () => {
    const YouTubeApp = loadApp();
    delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    render(<YouTubeApp />);
    expect(
      screen.getByText(/YouTube API key is not configured/i)
    ).toBeInTheDocument();
  });

  it('renders video cards with thumbnail and metadata', () => {
    const YouTubeApp = loadApp();
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
    const YouTubeApp = loadApp();
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    expect(screen.getAllByTestId('video-card')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Dev' }));
    expect(screen.getAllByTestId('video-card')).toHaveLength(2);
    expect(screen.queryByText('Cooking with React')).not.toBeInTheDocument();
  });

  it('search input limits results by title', async () => {
    const YouTubeApp = loadApp();
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    await user.type(screen.getByPlaceholderText(/search/i), 'Advanced');
    expect(screen.getAllByTestId('video-card')).toHaveLength(1);
    expect(screen.getByText('Advanced React')).toBeInTheDocument();
    expect(screen.queryByText('React Tutorial')).not.toBeInTheDocument();
  });

  it('allows sorting after switching categories', async () => {
    const YouTubeApp = loadApp();
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
    const YouTubeApp = loadApp();
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
    const YouTubeApp = loadApp();
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

  it('fetches all pages from a playlist', async () => {
    const YouTubeApp = loadApp();
    const responses = {
      channel: { items: [{ id: 'chan' }] },
      playlists: { items: [{ id: 'pl1', snippet: { title: 'PL1' } }] },
      pl1Page1: {
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
        nextPageToken: 'page2',
      },
      pl1Page2: {
        items: [
          {
            snippet: {
              resourceId: { videoId: 'b' },
              title: 'Video B',
              publishedAt: '2020-02-01T00:00:00Z',
              thumbnails: { medium: { url: 'b.jpg' } },
              channelTitle: 'x',
            },
          },
        ],
      },
      favorites: { items: [] },
    };

    global.fetch = jest.fn(async (url) => {
      if (url.includes('channels')) return { json: async () => responses.channel };
      if (url.includes('playlists?'))
        return { json: async () => responses.playlists };
      if (url.includes('playlistItems')) {
        const u = new URL(url);
        const plId = u.searchParams.get('playlistId');
        const token = u.searchParams.get('pageToken');
        if (plId === 'pl1' && !token)
          return { json: async () => responses.pl1Page1 };
        if (plId === 'pl1' && token === 'page2')
          return { json: async () => responses.pl1Page2 };
        return { json: async () => responses.favorites };
      }
      return { json: async () => ({}) };
    });

    render(<YouTubeApp />);

    const cards = await screen.findAllByTestId('video-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Video A')).toBeInTheDocument();
    expect(screen.getByText('Video B')).toBeInTheDocument();
  });

  it('fetches multiple playlists concurrently and renders all videos', async () => {
    const YouTubeApp = loadApp();
    const originalFetch = global.fetch;
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
      favorites: { items: [] },
    };

    const resolvers = {};
    global.fetch = jest.fn((url) => {
      if (url.includes('channels'))
        return Promise.resolve({ json: async () => responses.channel });
      if (url.includes('playlists?'))
        return Promise.resolve({ json: async () => responses.playlists });
      if (url.includes('playlistItems')) {
        const u = new URL(url);
        const plId = u.searchParams.get('playlistId');
        if (plId && plId.startsWith('LL'))
          return Promise.resolve({ json: async () => responses.favorites });
        return new Promise((resolve) => {
          resolvers[plId] = () => resolve({ json: async () => responses[plId] });
        });
      }
      return Promise.resolve({ json: async () => ({}) });
    });

    render(<YouTubeApp />);

    await waitFor(() => {
      expect(resolvers.pl1).toBeDefined();
      expect(resolvers.pl2).toBeDefined();
    });

    resolvers.pl1();
    resolvers.pl2();

    const cards = await screen.findAllByTestId('video-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Video A')).toBeInTheDocument();
    expect(screen.getByText('Video C')).toBeInTheDocument();

    global.fetch = originalFetch;
  });

  it('category buttons and video cards retain transition classes', () => {
    const YouTubeApp = loadApp();
    render(<YouTubeApp initialVideos={mockVideos} />);
    ['All', 'Dev', 'Cook'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveClass('transition-colors');
    });
    screen
      .getAllByTestId('video-card')
      .forEach((card) => expect(card).toHaveClass('transition'));
  });

  it('renders videos with missing properties safely', () => {
    const YouTubeApp = loadApp();
    const incomplete = [{ id: '4' }];
    render(<YouTubeApp initialVideos={incomplete} />);
    expect(screen.getAllByTestId('video-card')).toHaveLength(1);
  });

});
