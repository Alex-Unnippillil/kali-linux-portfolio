import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ScreenRecorder, { formatBytes } from '../components/apps/screen-recorder';

class MockMediaRecorder {
  public static dataSize = 0;

  public static lastOptions: MediaRecorderOptions | undefined;

  public ondataavailable: ((event: BlobEvent) => void) | null = null;

  public onstop: (() => void) | null = null;

  constructor(public stream: MediaStream, public options?: MediaRecorderOptions) {
    MockMediaRecorder.lastOptions = options;
  }

  start() {}

  stop() {
    const data = new Blob([new Uint8Array(MockMediaRecorder.dataSize)]);
    this.ondataavailable?.({ data } as BlobEvent);
    this.onstop?.();
  }
}

describe('ScreenRecorder app', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const getDisplayMedia = jest.fn();

  beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getDisplayMedia },
      configurable: true,
      writable: true,
    });
    (global as any).MediaRecorder = MockMediaRecorder;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    getDisplayMedia.mockReset();
    MockMediaRecorder.dataSize = 0;
    MockMediaRecorder.lastOptions = undefined;
    (URL.createObjectURL as jest.Mock).mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders preset buttons and updates selection details', () => {
    render(<ScreenRecorder />);
    expect(screen.getByText(/Video 4 Mbps · Audio 128 kbps/)).toBeInTheDocument();
    const efficient = screen.getByRole('button', { name: /Efficient 720p/i });
    fireEvent.click(efficient);
    expect(efficient).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Video 2.5 Mbps · Audio 96 kbps/)).toBeInTheDocument();
  });

  it('estimates recording size and reports actual blob size', async () => {
    jest.useFakeTimers({ now: 0 });
    const trackStop = jest.fn();
    getDisplayMedia.mockResolvedValue({
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream);
    MockMediaRecorder.dataSize = 1_048_576; // 1 MB

    render(<ScreenRecorder />);

    const startButton = screen.getByRole('button', { name: /start recording/i });
    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(MockMediaRecorder.lastOptions).toMatchObject({
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });

    const stopButton = await screen.findByRole('button', { name: /stop recording/i });

    act(() => {
      jest.advanceTimersByTime(2000);
      jest.setSystemTime(2000);
    });
    expect(Date.now()).toBe(2000);

    await act(async () => {
      fireEvent.click(stopButton);
    });

    const expectedEstimateBytes = (4_128_000 * 2) / 8;
    const expectedEstimateText = `Estimated size: ${formatBytes(expectedEstimateBytes)}`;
    const expectedActualText = `Actual size: ${formatBytes(MockMediaRecorder.dataSize)}`;
    const differenceBytes = Math.abs(MockMediaRecorder.dataSize - expectedEstimateBytes);
    const percentDiff = ((MockMediaRecorder.dataSize - expectedEstimateBytes) / expectedEstimateBytes) * 100;
    const expectedDiffText = `Difference: ${formatBytes(differenceBytes)} (${percentDiff >= 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`;

    expect(await screen.findByText(expectedEstimateText)).toBeInTheDocument();
    expect(screen.getByText(expectedActualText)).toBeInTheDocument();
    expect(screen.getByText(expectedDiffText)).toBeInTheDocument();
    expect(trackStop).toHaveBeenCalled();

  });
});
