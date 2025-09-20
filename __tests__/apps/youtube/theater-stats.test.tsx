import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import YouTubeApp from '../../../components/apps/youtube';
import type { Video } from '../../../apps/youtube/state/watchLater';

function setupYouTubePlayerMock() {
  let statsData = { droppedFrames: 0, totalFrames: 120 };

  const playerMock = {
    loadVideoById: jest.fn(),
    getPlayerState: jest.fn(() => 2),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    seekTo: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    getPlaybackRate: jest.fn(() => 1),
    getPlaybackQuality: jest.fn(() => 'hd720'),
    getVideoStats: jest.fn(() => statsData),
    getVideoLoadedFraction: jest.fn(() => 0.5),
  };

  (window as any).YT = {
    PlayerState: { PLAYING: 1, PAUSED: 2 },
    Player: jest.fn((_element: any, options: any) => {
      options?.events?.onReady?.({ target: playerMock });
      options?.events?.onStateChange?.({ data: 2 });
      return playerMock;
    }),
  };

  return {
    playerMock,
    updateStats(next: { droppedFrames: number; totalFrames: number }) {
      statsData = next;
    },
  };
}

const mockVideo: Video = {
  id: 'abc123',
  title: 'Test Video Title',
  thumbnail: 'thumb.jpg',
  channelName: 'Channel Name',
  channelId: 'channel-id',
};

describe('YouTubeApp theater mode and stats overlay', () => {
  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).YT;
    delete (window as any).onYouTubeIframeAPIReady;
  });

  it('toggles theater mode layout classes', async () => {
    setupYouTubePlayerMock();

    render(<YouTubeApp initialResults={[mockVideo]} />);

    const videoThumb = await screen.findByAltText(mockVideo.title);
    fireEvent.click(videoThumb);

    const playerContainer = await screen.findByTestId('player-container');
    expect(playerContainer).toHaveAttribute('data-state', 'default');
    expect(playerContainer.className).toContain('mx-4');

    const theaterToggle = await screen.findByRole('button', {
      name: /enter theater mode/i,
    });

    fireEvent.click(theaterToggle);

    await waitFor(() => {
      expect(playerContainer).toHaveAttribute('data-state', 'theater');
    });
    expect(playerContainer.className).toContain('max-w-6xl');
    expect(theaterToggle).toHaveAttribute('aria-pressed', 'true');
    expect(theaterToggle).toHaveAttribute('aria-label', 'Exit theater mode');

    fireEvent.click(theaterToggle);
    await waitFor(() => {
      expect(playerContainer).toHaveAttribute('data-state', 'default');
    });
    expect(theaterToggle).toHaveAttribute('aria-label', 'Enter theater mode');
  });

  it('updates stats overlay once per second', async () => {
    jest.useFakeTimers();
    const { playerMock, updateStats } = setupYouTubePlayerMock();

    render(<YouTubeApp initialResults={[mockVideo]} />);

    const videoThumb = await screen.findByAltText(mockVideo.title);
    fireEvent.click(videoThumb);

    const statsToggle = await screen.findByRole('button', {
      name: /show stats overlay/i,
    });
    fireEvent.click(statsToggle);

    const overlay = await screen.findByTestId('youtube-stats-overlay');
    expect(overlay).toHaveTextContent('Resolution');
    expect(overlay).toHaveTextContent('1280×720');
    expect(overlay).toHaveTextContent('Dropped frames');
    expect(overlay).toHaveTextContent('0 / 120');

    act(() => {
      updateStats({ droppedFrames: 5, totalFrames: 200 });
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(overlay).toHaveTextContent('5 / 200');
    });
    expect(playerMock.getVideoStats).toHaveBeenCalled();

    fireEvent.click(statsToggle);
    await waitFor(() => {
      expect(screen.queryByTestId('youtube-stats-overlay')).toBeNull();
    });
  });
});
