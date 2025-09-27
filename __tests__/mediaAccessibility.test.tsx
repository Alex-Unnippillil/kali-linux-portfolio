import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CameraApp from '../components/apps/camera';
import QRScanner from '../components/apps/qr';
import ScreenRecorder from '../components/apps/screen-recorder';
import SpotifyApp from '../components/apps/spotify';

class MockBarcodeDetector {
  detect() {
    return Promise.resolve([] as { rawValue: string }[]);
  }
}

declare global {
  interface Window {
    BarcodeDetector?: typeof MockBarcodeDetector;
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify: any;
  }
}

describe('media components accessibility', () => {
  beforeAll(() => {
    Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(global.HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(global.HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() {
        return (this as any).__srcObject || null;
      },
      set(value) {
        (this as any).__srcObject = value;
      },
    });
  });

  beforeEach(() => {
    const mockStream = {
      getTracks: () => [],
      getVideoTracks: () => [],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
        getDisplayMedia: jest.fn().mockResolvedValue(mockStream),
      },
    });

    window.BarcodeDetector = MockBarcodeDetector as unknown as typeof MockBarcodeDetector;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete window.BarcodeDetector;
  });

  it('CameraApp video is muted, described, and captioned', async () => {
    render(<CameraApp />);
    const video = (await screen.findByTestId('camera-video')) as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('aria-describedby', 'camera-video-description');
    expect(video.querySelector('track[kind="captions"]')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /hide captions/i })).toBeInTheDocument();
  });

  it('QRScanner video is muted, described, and captioned', async () => {
    render(<QRScanner />);
    const video = (await screen.findByTestId('qr-video')) as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('aria-describedby', 'qr-video-description');
    expect(video.querySelector('track[kind="captions"]')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /hide captions/i })).toBeInTheDocument();
  });

  it('ScreenRecorder playback video exposes captions and descriptions', async () => {
    render(<ScreenRecorder initialVideoUrl="blob:example" />);
    const video = (await screen.findByTestId('screen-recorder-video')) as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('aria-describedby', 'screen-recorder-video-description');
    expect(video.querySelector('track[kind="captions"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide captions/i })).toBeInTheDocument();
  });

  it('Spotify sample audio starts muted with captions and descriptions', () => {
    render(<SpotifyApp />);
    const audio = screen.getByTestId('spotify-audio') as HTMLAudioElement;
    expect(audio.muted).toBe(true);
    expect(audio).toHaveAttribute('aria-describedby', 'spotify-audio-description');
    expect(audio.querySelector('track[kind="captions"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide captions/i })).toBeInTheDocument();
  });
});
