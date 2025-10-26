import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BleSensorApp from '../apps/ble-sensor';

describe('BLE Sensor controls', () => {
  const originalMemory = (performance as any).memory;
  const originalCreateObjectURL = (URL as any).createObjectURL;
  const originalRevokeObjectURL = (URL as any).revokeObjectURL;
  const originalBlob = global.Blob;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    (performance as any).memory = {
      usedJSHeapSize: 12 * 1024 * 1024,
      totalJSHeapSize: 24 * 1024 * 1024,
      jsHeapSizeLimit: 48 * 1024 * 1024,
    };
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    if (originalMemory) {
      (performance as any).memory = originalMemory;
    } else {
      delete (performance as any).memory;
    }
    if (originalCreateObjectURL) {
      (URL as any).createObjectURL = originalCreateObjectURL;
    } else {
      delete (URL as any).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      (URL as any).revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete (URL as any).revokeObjectURL;
    }
    global.Blob = originalBlob;
    jest.restoreAllMocks();
  });

  it('buffers while paused without rendering updates', () => {
    render(<BleSensorApp />);
    const status = screen.getByTestId('stream-status');
    const count = screen.getByTestId('buffer-count');
    const pauseButton = screen.getByRole('button', { name: /pause stream/i });

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    const beforePause = Number(count.textContent);
    expect(beforePause).toBeGreaterThan(0);
    expect(status).toHaveTextContent('Status: Live');

    fireEvent.click(pauseButton);
    expect(screen.getByTestId('stream-status')).toHaveTextContent('Status: Paused');
    const canvas = screen.getByTestId('chart-canvas');
    expect(canvas).toHaveAttribute('data-paused', 'true');

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    const pausedCount = Number(screen.getByTestId('buffer-count').textContent);
    expect(pausedCount).toBeGreaterThan(beforePause);

    const resumeButton = screen.getByRole('button', { name: /resume stream/i });
    fireEvent.click(resumeButton);
    expect(screen.getByTestId('stream-status')).toHaveTextContent('Status: Live');
    expect(canvas).toHaveAttribute('data-paused', 'false');
  });

  it('exports the current buffer to CSV', async () => {
    class RecordingBlob {
      parts: unknown[];
      type?: string;

      constructor(parts: unknown[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.type = options?.type;
      }
    }

    global.Blob = RecordingBlob as unknown as typeof Blob;

    let recordedCsv = '';

    const createUrl = jest.fn((blob: RecordingBlob) => {
      recordedCsv = Array.isArray(blob.parts) ? blob.parts.join('') : '';
      return 'blob:ble-test';
    });
    const revokeUrl = jest.fn();
    (URL as any).createObjectURL = createUrl;
    (URL as any).revokeObjectURL = revokeUrl;
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const { unmount } = render(<BleSensorApp />);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    });

    expect(recordedCsv).toContain('timestamp,value');
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalled();

    unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:ble-test');
  });
});
