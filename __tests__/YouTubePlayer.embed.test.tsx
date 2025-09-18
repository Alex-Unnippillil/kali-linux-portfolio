import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YouTubePlayer from '../components/YouTubePlayer';

jest.mock('../hooks/usePrefersReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: () => ({
    supported: false,
    getDir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    listFiles: jest.fn(),
  }),
}));

describe('YouTubePlayer privacy parameters', () => {
  afterEach(() => {
    delete (window as any).YT;
  });

  it('passes privacy-enhanced playerVars to the iframe API', async () => {
    const playerMock = jest.fn((_el, opts) => {
      opts.events?.onReady?.({
        target: {
          getVideoData: () => ({}),
          pauseVideo: jest.fn(),
          getAvailablePlaybackRates: () => [1],
          getPlaybackRate: () => 1,
        },
      });
      return {
        getPlayerState: () => window.YT.PlayerState.PAUSED,
        pauseVideo: jest.fn(),
        playVideo: jest.fn(),
        seekTo: jest.fn(),
        getCurrentTime: jest.fn().mockReturnValue(0),
        getPlaybackRate: jest.fn().mockReturnValue(1),
        getAvailablePlaybackRates: jest.fn().mockReturnValue([1]),
      };
    });
    (window as any).YT = {
      Player: playerMock,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };

    render(<YouTubePlayer videoId="abc123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Play video' }));

    await waitFor(() => expect(playerMock).toHaveBeenCalled());

    const [, options] = playerMock.mock.calls[0];
    expect(options.host).toBe('https://www.youtube-nocookie.com');
    expect(options.playerVars).toMatchObject({
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      origin: window.location.origin,
    });
  });
});
