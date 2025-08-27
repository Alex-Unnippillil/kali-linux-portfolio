import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: '1',
    title: 'React Tutorial',
    publishedAt: '2022-01-01T00:00:00Z',
    thumbnail: 'thumb1.jpg',
  },
  {
    id: '2',
    title: 'Cooking with React',
    publishedAt: '2022-02-01T00:00:00Z',
    thumbnail: 'thumb2.jpg',
  },
];

describe('YouTubeApp', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'test';
    // clear queue persisted state
    window.localStorage.clear();
  });

  it('shows message when API key is missing', () => {
    delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    render(<YouTubeApp />);
    expect(
      screen.getByText(/YouTube API key is not configured/i),
    ).toBeInTheDocument();
  });

  it('queues a video from the initial list', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    await user.click(screen.getAllByText(/add to queue/i)[0]);
    expect(screen.getByTestId('queue-list')).toHaveTextContent('React Tutorial');
  });

  it('toggles no-cookie domain', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=1',
    );
    await user.click(screen.getByLabelText(/no-cookie/i));
    expect(link).toHaveAttribute(
      'href',
      'https://www.youtube-nocookie.com/embed/1',
    );
  });

  it('fetches results for a search query (debounced)', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              id: { videoId: 'x' },
              snippet: {
                title: 'Result Video',
                publishedAt: '2020-01-01T00:00:00Z',
                thumbnails: { medium: { url: 'x.jpg' } },
              },
            },
          ],
          nextPageToken: null,
        }),
      });

    render(<YouTubeApp />);
    await user.type(screen.getByPlaceholderText(/search/i), 'react');
    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Result Video')).toBeInTheDocument();

    jest.useRealTimers();
  });
});

