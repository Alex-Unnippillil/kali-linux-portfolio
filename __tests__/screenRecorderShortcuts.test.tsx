import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import ScreenRecorder from '../components/apps/screen-recorder';

describe('ScreenRecorder keyboard shortcuts', () => {
  let originalMediaDevices: typeof navigator.mediaDevices | undefined;
  let originalMediaRecorder: typeof MediaRecorder | undefined;
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalWindowCreateObjectURL: typeof URL.createObjectURL | undefined;
  let recorderInstance: {
    stop: jest.Mock;
  } | null = null;

  beforeEach(() => {
    localStorage.clear();
    recorderInstance = null;
    originalMediaDevices = navigator.mediaDevices;
    originalMediaRecorder = (global as any).MediaRecorder;
    originalCreateObjectURL = URL.createObjectURL;
    originalWindowCreateObjectURL = typeof window === 'undefined' ? undefined : window.URL?.createObjectURL;

    const mockTrack = { stop: jest.fn() };
    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    (navigator as any).mediaDevices = {
      getDisplayMedia: jest.fn().mockResolvedValue(mockStream),
    };

    class MockMediaRecorder {
      public ondataavailable: ((event: any) => void) | null = null;
      public onstop: (() => void) | null = null;
      public start = jest.fn();
      public stop = jest.fn(() => {
        this.onstop?.();
      });

      constructor(public stream: MediaStream) {
        recorderInstance = this as unknown as { stop: jest.Mock };
      }
    }

    (global as any).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    const createObjectURLMock = jest.fn(() => 'blob:mock-url');
    (URL as any).createObjectURL = createObjectURLMock;
    if (typeof window !== 'undefined') {
      (window.URL as any).createObjectURL = createObjectURLMock;
    }
  });

  afterEach(() => {
    if (originalMediaDevices) (navigator as any).mediaDevices = originalMediaDevices;
    else delete (navigator as any).mediaDevices;

    if (originalMediaRecorder) (global as any).MediaRecorder = originalMediaRecorder;
    else delete (global as any).MediaRecorder;

    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    else delete (URL as any).createObjectURL;

    if (typeof window !== 'undefined') {
      if (originalWindowCreateObjectURL) window.URL.createObjectURL = originalWindowCreateObjectURL;
      else delete (window.URL as any).createObjectURL;
    }
  });

  const startAndConfirmRecording = async () => {
    render(<ScreenRecorder />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await screen.findByRole('button', { name: /stop recording/i });

    expect(recorderInstance).not.toBeNull();
  };

  test('Ctrl+Shift+R stops an active recording', async () => {
    await startAndConfirmRecording();

    fireEvent.keyDown(window, { key: 'r', ctrlKey: true, shiftKey: true });

    await waitFor(() => {
      expect(recorderInstance?.stop).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
    });
  });

  test('Cmd+Shift+R stops an active recording', async () => {
    await startAndConfirmRecording();

    fireEvent.keyDown(window, { key: 'R', metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(recorderInstance?.stop).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
    });
  });
});

