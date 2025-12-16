import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

let YouTubeApp: (typeof import('../components/apps/youtube'))['default'];

describe('YouTubeApp', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'test-key';
    ({ default: YouTubeApp } = await import('../components/apps/youtube'));
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('renders channel playlists and loads playlist videos', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        const asUrl = new URL(url);

        if (url.includes('/youtube/v3/channels')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'UCxPIJ3hw6AOwomUWh5B7SfQ',
                  snippet: {
                    title: 'Alex Unnippillil',
                    thumbnails: { high: { url: 'https://example.com/channel.jpg' } },
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }

        if (url.includes('/youtube/v3/playlists')) {
          const channelId = asUrl.searchParams.get('channelId');
          if (!channelId) {
            return new Response(JSON.stringify({ items: [] }), { status: 200 });
          }

          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'PL_LABS',
                  snippet: {
                    title: 'Lab Playlist',
                    description: 'Lab desc',
                    publishedAt: '2024-01-01T00:00:00Z',
                    thumbnails: { high: { url: 'https://example.com/pl1.jpg' } },
                  },
                  contentDetails: { itemCount: 2 },
                  status: { privacyStatus: 'public' },
                },
                {
                  id: 'PL_TUTORIALS',
                  snippet: {
                    title: 'Tutorial Playlist',
                    description: 'Tutorial desc',
                    publishedAt: '2024-02-01T00:00:00Z',
                    thumbnails: { high: { url: 'https://example.com/pl2.jpg' } },
                  },
                  contentDetails: { itemCount: 1 },
                  status: { privacyStatus: 'public' },
                },
              ],
            }),
            { status: 200 },
          );
        }

        if (url.includes('/youtube/v3/playlistItems')) {
          // Return different items depending on playlistId query param
          const playlistId = asUrl.searchParams.get('playlistId');
          const items =
            playlistId === 'PL_LABS'
              ? [
                  {
                    snippet: {
                      title: 'First Lab Video',
                      description: 'desc',
                      publishedAt: '2024-03-01T00:00:00Z',
                      position: 0,
                      resourceId: { videoId: 'VID_1' },
                      thumbnails: { high: { url: 'https://example.com/v1.jpg' } },
                    },
                  },
                ]
              : [
                  {
                    snippet: {
                      title: 'First Tutorial Video',
                      description: 'desc',
                      publishedAt: '2024-04-01T00:00:00Z',
                      position: 0,
                      resourceId: { videoId: 'VID_2' },
                      thumbnails: { high: { url: 'https://example.com/v2.jpg' } },
                    },
                  },
                ];

          return new Response(JSON.stringify({ items }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: { message: 'Unknown endpoint' } }), {
          status: 404,
        });
      });

    render(<YouTubeApp channelId="UCxPIJ3hw6AOwomUWh5B7SfQ" />);

    // Directory section
    await waitFor(() => {
      expect(screen.getByText('Playlists')).toBeInTheDocument();
    });

    // Playlist listing
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open playlist Lab Playlist/i })).toBeInTheDocument();
    });

    // Select playlist + video
    fireEvent.click(screen.getByRole('button', { name: /Open playlist Lab Playlist/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Watch First Lab Video/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Watch First Lab Video/i }));

    await waitFor(() => {
      expect(screen.getByTitle(/YouTube player for First Lab Video/i)).toHaveAttribute(
        'src',
        expect.stringContaining('VID_1'),
      );
    });

    // sanity: fetch called
    expect(fetchMock).toHaveBeenCalled();
  });
});
