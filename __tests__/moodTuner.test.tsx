import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodTuner from '../apps/spotify/components/MoodTuner';

describe('MoodTuner sandboxing', () => {
  const playlists = { chill: 'playlist-id' };
  const originalFetch = global.fetch;

  beforeEach(() => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      if (typeof url === 'string' && url.startsWith('/spotify-playlists.json')) {
        return {
          json: async () => playlists,
        } as unknown as Response;
      }
      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error restore undefined fetch
      delete global.fetch;
    }
  });

  it('renders the Spotify embed inside a sandboxed iframe', async () => {
    render(<MoodTuner />);
    const frame = await screen.findByTitle('chill');
    expect(frame).toHaveAttribute(
      'sandbox',
      'allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation',
    );
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('sends commands to the Spotify origin and ignores other messages', async () => {
    const user = userEvent.setup();
    render(<MoodTuner />);
    const frame = await screen.findByTitle('chill');
    const frameWindow = { postMessage: jest.fn() } as Window;
    Object.defineProperty(frame, 'contentWindow', {
      value: frameWindow,
      configurable: true,
    });

    const playButton = await screen.findByTitle('Play/Pause (Space)');
    await user.click(playButton);
    expect(frameWindow.postMessage).toHaveBeenCalledWith(
      { command: 'play' },
      'https://open.spotify.com',
    );
    expect(playButton).toHaveTextContent('⏸');

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.example',
          data: ['playback_update', { is_paused: true }],
          source: frameWindow,
        }),
      );
    });
    expect(playButton).toHaveTextContent('⏸');

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://open.spotify.com',
          data: ['playback_update', { is_paused: true }],
          source: frameWindow,
        }),
      );
    });
    expect(playButton).toHaveTextContent('▶');
  });
});

