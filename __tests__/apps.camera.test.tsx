import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CameraApp from '../components/apps/camera';
import useOPFS from '../hooks/useOPFS';

jest.mock('../hooks/useOPFS');

const mockedUseOPFS = useOPFS as jest.MockedFunction<typeof useOPFS>;

const trackStop = jest.fn();
const mediaTrack = {
  stop: trackStop,
  getSettings: () => ({ deviceId: 'cam-1' }),
  getCapabilities: () => ({}),
  applyConstraints: jest.fn(() => Promise.resolve()),
} as unknown as MediaStreamTrack;

const audioTrack = { stop: jest.fn() } as unknown as MediaStreamTrack;

const mockStream = {
  getTracks: () => [mediaTrack, audioTrack],
  getVideoTracks: () => [mediaTrack],
  getAudioTracks: () => [audioTrack],
} as unknown as MediaStream;

const getUserMedia = jest.fn(() => Promise.resolve(mockStream));
const enumerateDevices = jest.fn(() => Promise.resolve([{ deviceId: 'cam-1', kind: 'videoinput', label: 'Front', groupId: 'g1', toJSON: () => ({}) }] as MediaDeviceInfo[]));
const addMediaListener = jest.fn();
const removeMediaListener = jest.fn();

const createObjectURL = jest.fn(() => 'blob:test-url');
const revokeObjectURL = jest.fn();

class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);
  state: RecordingState = 'inactive';
  mimeType = 'video/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['clip']) } as BlobEvent);
    this.onstop?.();
  }
  pause() {
    this.state = 'paused';
  }
  resume() {
    this.state = 'recording';
  }
}

const startCamera = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));
  });
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
};

describe('Camera app', () => {
  beforeAll(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  });

  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    Object.defineProperty(window, 'MediaRecorder', { value: MockMediaRecorder, configurable: true });

    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia,
          enumerateDevices,
          addEventListener: addMediaListener,
          removeEventListener: removeMediaListener,
          ondevicechange: null,
        },
      },
      configurable: true,
    });

    mockedUseOPFS.mockReturnValue({
      supported: true,
      root: null,
      getDir: jest.fn(() => Promise.resolve({} as FileSystemDirectoryHandle)),
      readFile: jest.fn(),
      writeFile: jest.fn(() => Promise.resolve(true)),
      deleteFile: jest.fn(() => Promise.resolve(true)),
      listFiles: jest.fn(() => Promise.resolve([])),
    });

    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    const context = {
      save: jest.fn(),
      restore: jest.fn(),
      clearRect: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      imageSmoothingEnabled: true,
      filter: 'none',
      font: '12px monospace',
      fillStyle: '#fff',
      canvas: document.createElement('canvas'),
    } as unknown as CanvasRenderingContext2D;

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    getUserMedia.mockClear();
    enumerateDevices.mockClear();
    trackStop.mockClear();
    addMediaListener.mockClear();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('Start Camera calls getUserMedia once from user action and shows Live state', async () => {
    render(<CameraApp />);
    expect(getUserMedia).not.toHaveBeenCalled();

    await startCamera();

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('Stop stops tracks', async () => {
    render(<CameraApp />);
    await startCamera();

    fireEvent.click(screen.getByRole('button', { name: /stop camera/i }));
    expect(trackStop).toHaveBeenCalled();
  });

  it('Photo capture adds Blob object URL and not base64', async () => {
    mockedUseOPFS.mockReturnValue({
      supported: false,
      root: null,
      getDir: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(() => Promise.resolve([])),
    });

    render(<CameraApp />);
    await startCamera();

    fireEvent.click(screen.getByRole('button', { name: /shoot/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob)));
    const photo = screen.getByRole('img');
    expect(photo).toHaveAttribute('src', 'blob:test-url');
    expect(photo.getAttribute('src')).not.toContain('data:image');
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('download', expect.stringMatching(/^IMG_/));
  });

  it('Countdown appears and can be canceled', async () => {
    jest.useFakeTimers();
    render(<CameraApp />);
    await startCamera();

    fireEvent.change(screen.getByLabelText('Timer'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /shoot/i }));

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('3')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('Video mode is disabled with a clear message if MediaRecorder is missing', () => {
    Object.defineProperty(window, 'MediaRecorder', { value: undefined, configurable: true });

    render(<CameraApp />);

    expect(screen.getByText(/video mode is unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Clip' })).toBeDisabled();
  });

  it('OPFS save path uses getDir(Media/Camera) and writeFile with Blob', async () => {
    const getDir = jest.fn(() => Promise.resolve({} as FileSystemDirectoryHandle));
    const writeFile = jest.fn(() => Promise.resolve(true));

    mockedUseOPFS.mockReturnValue({
      supported: true,
      root: null,
      getDir,
      readFile: jest.fn(),
      writeFile,
      deleteFile: jest.fn(() => Promise.resolve(true)),
      listFiles: jest.fn(() => Promise.resolve([])),
    });

    render(<CameraApp />);
    await startCamera();

    fireEvent.click(screen.getByRole('button', { name: /shoot/i }));

    await waitFor(() => expect(getDir).toHaveBeenCalledWith('Media/Camera', { create: true }));
    await waitFor(() => expect(writeFile).toHaveBeenCalledWith(expect.stringMatching(/^IMG_/), expect.any(Blob), expect.anything()));
  });

  it('wires devicechange handler and reacts by refreshing devices', async () => {
    let handler: (() => void) | undefined;
    addMediaListener.mockImplementation((event: string, cb: () => void) => {
      if (event === 'devicechange') handler = cb;
    });

    render(<CameraApp />);

    expect(addMediaListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    await act(async () => {
      handler?.();
    });

    await waitFor(() => expect(enumerateDevices).toHaveBeenCalled());
  });
});
