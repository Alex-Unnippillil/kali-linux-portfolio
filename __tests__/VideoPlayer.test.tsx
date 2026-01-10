import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VideoPlayer from '../components/ui/VideoPlayer';

describe('VideoPlayer keyboard shortcuts', () => {
  const originalPictureInPictureEnabled = (document as any).pictureInPictureEnabled;

  beforeEach(() => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    (document as any).exitPictureInPicture = jest.fn();
  });

  afterEach(() => {
    if (originalPictureInPictureEnabled === undefined) {
      delete (document as any).pictureInPictureEnabled;
    } else {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        configurable: true,
        value: originalPictureInPictureEnabled,
      });
    }
    delete (document as any).exitPictureInPicture;
    jest.clearAllMocks();
  });

  const setupMediaElement = (video: HTMLVideoElement) => {
    let currentTime = 60;
    let volume = 0.5;
    let muted = false;

    Object.defineProperty(video, 'duration', {
      configurable: true,
      value: 120,
    });

    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value: number) => {
        currentTime = value;
      },
    });

    Object.defineProperty(video, 'volume', {
      configurable: true,
      get: () => volume,
      set: (value: number) => {
        volume = value;
      },
    });

    Object.defineProperty(video, 'muted', {
      configurable: true,
      get: () => muted,
      set: (value: boolean) => {
        muted = value;
      },
    });

    video.play = jest.fn().mockResolvedValue(undefined);
    video.pause = jest.fn();

    return {
      get currentTime() {
        return currentTime;
      },
      get volume() {
        return volume;
      },
      get muted() {
        return muted;
      },
    };
  };

  it('seeks with J/K/L keyboard shortcuts', () => {
    const { container } = render(<VideoPlayer src="video.mp4" />);
    const wrapper = container.querySelector('[aria-label="Custom video player"]') as HTMLElement;
    const video = container.querySelector('video') as HTMLVideoElement;
    const media = setupMediaElement(video);

    fireEvent.loadedMetadata(video);
    wrapper.focus();

    fireEvent.keyDown(wrapper, { key: 'j' });
    expect(media.currentTime).toBeCloseTo(50);

    fireEvent.keyDown(wrapper, { key: 'k' });
    expect(media.currentTime).toBeCloseTo(45);

    fireEvent.keyDown(wrapper, { key: 'l' });
    expect(media.currentTime).toBeCloseTo(55);
  });

  it('adjusts volume with arrow keys and toggles mute with M', () => {
    const { container } = render(<VideoPlayer src="video.mp4" />);
    const wrapper = container.querySelector('[aria-label="Custom video player"]') as HTMLElement;
    const video = container.querySelector('video') as HTMLVideoElement;
    const media = setupMediaElement(video);

    fireEvent.loadedMetadata(video);
    wrapper.focus();

    fireEvent.keyDown(wrapper, { key: 'ArrowUp' });
    expect(media.volume).toBeCloseTo(0.55, 2);

    fireEvent.keyDown(wrapper, { key: 'ArrowLeft' });
    expect(media.volume).toBeCloseTo(0.5, 2);

    fireEvent.keyDown(wrapper, { key: 'm' });
    expect(media.muted).toBe(true);

    fireEvent.keyDown(wrapper, { key: 'm' });
    expect(media.muted).toBe(false);
  });

  it('shows Doc-PiP fallback message when unsupported', () => {
    render(<VideoPlayer src="video.mp4" />);
    expect(
      screen.getByText(
        /Doc-PiP requires a browser with the Document Picture-in-Picture API/i,
      ),
    ).toBeInTheDocument();
  });
});
