import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayer from '../components/ui/VideoPlayer';

describe('VideoPlayer', () => {
  let playSpy: jest.SpyInstance;
  let pauseSpy: jest.SpyInstance;

  beforeAll(() => {
    playSpy = jest
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(async function play(this: HTMLMediaElement) {
        return undefined;
      });
    pauseSpy = jest
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(function pause(this: HTMLMediaElement) {
        return undefined;
      });
  });

  afterEach(() => {
    playSpy.mockClear();
    pauseSpy.mockClear();
  });

  afterAll(() => {
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  it('exposes custom controls, shortcuts, and caption toggles', async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="/video.mp4" />);

    const player = screen.getByRole('group', { name: /video player/i });
    const video = screen.getByLabelText('Video') as HTMLVideoElement;

    Object.defineProperty(video, 'duration', { value: 120, configurable: true });
    const track = { mode: 'hidden' } as TextTrack;
    const trackList = {
      length: 1,
      0: track,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as TextTrackList;
    Object.defineProperty(video, 'textTracks', { value: trackList, configurable: true });

    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    const playButton = screen.getByRole('button', { name: /play video/i });
    await user.click(playButton);
    expect(playSpy).toHaveBeenCalled();

    await act(async () => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
    });

    expect(screen.getByRole('button', { name: /pause video/i })).toBeInTheDocument();

    player.focus();
    await user.keyboard(' ');
    expect(pauseSpy).toHaveBeenCalled();

    await act(async () => {
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      video.dispatchEvent(new Event('pause'));
      video.currentTime = 10;
      video.dispatchEvent(new Event('timeupdate'));
    });

    const seekForward = screen.getByRole('button', { name: /forward 5 seconds/i });
    await user.click(seekForward);
    expect(video.currentTime).toBeCloseTo(15, 5);

    const ccButton = await screen.findByRole('button', { name: /show captions/i });
    await user.click(ccButton);
    expect(ccButton).toHaveAttribute('aria-pressed', 'true');
    expect(track.mode).toBe('showing');

    const timeline = screen.getByLabelText(/seek timeline/i) as HTMLInputElement;
    expect(Number(timeline.value)).toBeGreaterThanOrEqual(0);
    fireEvent.change(timeline, { target: { value: '20' } });
    expect(video.currentTime).toBeCloseTo(20, 5);

    expect(
      screen.getByText(
        /shortcuts: space toggles play, arrowleft\/arrowright seek 5 seconds, c toggles captions\./i,
      ),
    ).toBeInTheDocument();
  });
});
