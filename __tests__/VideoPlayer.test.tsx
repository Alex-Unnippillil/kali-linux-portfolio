import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayer from '../components/ui/VideoPlayer';

describe('VideoPlayer UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('toggles theater mode and persists preference', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VideoPlayer src="/video.mp4" />);
    const frame = screen.getByTestId('video-player-frame');
    const toggle = screen.getByRole('button', { name: /toggle theater mode/i });

    expect(frame).toHaveAttribute('data-theater-mode', 'off');

    await user.click(toggle);
    await waitFor(() => {
      expect(frame).toHaveAttribute('data-theater-mode', 'on');
    });
    await waitFor(() => {
      expect(window.localStorage.getItem('video-player:theater-mode')).toBe('true');
    });

    unmount();
    render(<VideoPlayer src="/video.mp4" />);
    const persistedFrame = screen.getByTestId('video-player-frame');
    expect(persistedFrame).toHaveAttribute('data-theater-mode', 'on');
  });

  it('updates stats overlay with resolution and dropped frames', async () => {
    jest.useFakeTimers();
    render(<VideoPlayer src="/video.mp4" />);

    const frame = screen.getByTestId('video-player-frame');
    const video = frame.querySelector('video') as HTMLVideoElement;
    expect(video).toBeTruthy();

    Object.defineProperty(video, 'videoWidth', {
      configurable: true,
      get: () => 1920,
    });
    Object.defineProperty(video, 'videoHeight', {
      configurable: true,
      get: () => 1080,
    });

    const qualityMock = jest.fn();
    qualityMock.mockReturnValueOnce({ droppedVideoFrames: 1 });
    qualityMock.mockReturnValue({ droppedVideoFrames: 5 });
    (video as any).getVideoPlaybackQuality = qualityMock;

    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    await screen.findByText('Resolution: 1920×1080');
    await screen.findByText('Dropped frames: 1');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Dropped frames: 5')).toBeInTheDocument();
  });
});
