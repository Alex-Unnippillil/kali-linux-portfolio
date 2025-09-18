import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../../../components/apps/youtube';

const mockVideos = [
  {
    id: 'video-a',
    title: 'Video A',
    thumbnail: 'a.jpg',
    channelName: 'Chan A',
    channelId: 'chan-a',
  },
  {
    id: 'video-b',
    title: 'Video B',
    thumbnail: 'b.jpg',
    channelName: 'Chan B',
    channelId: 'chan-b',
  },
];

describe('YouTube privacy mode', () => {
  beforeEach(() => {
    delete (window as any).YT;
    delete (window as any).onYouTubeIframeAPIReady;
  });

  afterEach(() => {
    document
      .querySelectorAll('script[data-youtube-iframe-api]')
      .forEach((el) => el.remove());
    delete (window as any).YT;
    delete (window as any).onYouTubeIframeAPIReady;
  });

  it('surfaces privacy messaging and avoids iframe loads when blocked', async () => {
    const user = userEvent.setup();
    render(
      <YouTubeApp
        initialResults={mockVideos}
        detectThirdPartyCookies={() => true}
      />,
    );

    await user.click(screen.getByAltText('Video A'));

    const alert = await screen.findByTestId('privacy-mode-alert');
    expect(alert).toHaveTextContent('Privacy mode is active');
    expect(
      document.querySelector('script[data-youtube-iframe-api]'),
    ).toBeNull();
    expect(screen.queryByTitle('YouTube video player')).not.toBeInTheDocument();
  });

  it('passes privacy-enhanced host and hides related videos when allowed', async () => {
    const user = userEvent.setup();
    const loadVideoById = jest.fn();
    const mockPlayer = {
      loadVideoById,
      getPlaybackRate: () => 1,
      getPlayerState: () => 1,
      pauseVideo: jest.fn(),
      playVideo: jest.fn(),
      seekTo: jest.fn(),
    };
    const playerConstructor = jest
      .fn()
      .mockImplementation((_el, options) => {
        options.events?.onReady?.({ target: mockPlayer });
        return mockPlayer;
      });

    (window as any).YT = {
      Player: playerConstructor,
      PlayerState: { PLAYING: 1 },
    };

    render(
      <YouTubeApp
        initialResults={mockVideos}
        detectThirdPartyCookies={() => false}
      />,
    );

    await user.click(screen.getByAltText('Video A'));
    await waitFor(() => expect(playerConstructor).toHaveBeenCalled());

    const [, options] = playerConstructor.mock.calls[0];
    expect(options.host).toBe('https://www.youtube-nocookie.com');
    expect(options.playerVars).toMatchObject({ rel: 0, modestbranding: 1 });
  });

  it('loads the iframe API from youtube-nocookie when needed', async () => {
    const user = userEvent.setup();
    render(
      <YouTubeApp
        initialResults={mockVideos}
        detectThirdPartyCookies={() => false}
      />,
    );

    await user.click(screen.getByAltText('Video A'));
    await waitFor(() => {
      const script = document.querySelector<HTMLScriptElement>(
        'script[data-youtube-iframe-api]',
      );
      expect(script).not.toBeNull();
      expect(script?.src).toContain('https://www.youtube-nocookie.com/iframe_api');
    });
  });
});
