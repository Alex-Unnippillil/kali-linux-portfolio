import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import Scan from '../../../apps/qr/components/Scan';

describe('Scan camera toggle', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalBarcodeDetector = (window as any).BarcodeDetector;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const playDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'play');
  const pauseDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'pause');
  const srcObjectDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject');
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState');

  let stopTrack: jest.Mock;
  let getUserMedia: jest.Mock;

  beforeEach(() => {
    stopTrack = jest.fn();
    getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: stopTrack,
        },
      ],
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
      },
    });

    class MockBarcodeDetector {
      public detect = jest.fn().mockResolvedValue([]);
    }

    (window as any).BarcodeDetector = MockBarcodeDetector;

    let rafHandle = 1;
    const rafTimers = new Map<number, ReturnType<typeof setTimeout>>();

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: jest.fn().mockImplementation((cb: FrameRequestCallback) => {
        const handle = setTimeout(() => cb(0), 0);
        const id = rafHandle++;
        rafTimers.set(id, handle);
        return id;
      }),
    });

    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: jest.fn().mockImplementation((id: number) => {
        const handle = rafTimers.get(id);
        if (handle) {
          clearTimeout(handle);
          rafTimers.delete(id);
        }
      }),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn(),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() {
        return (this as any)._srcObject ?? null;
      },
      set(value) {
        (this as any)._srcObject = value;
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get() {
        return HTMLMediaElement.HAVE_ENOUGH_DATA;
      },
    });
  });

  afterEach(() => {
    if (originalMediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
      });
    } else {
      delete (navigator as any).mediaDevices;
    }

    if (originalBarcodeDetector) {
      (window as any).BarcodeDetector = originalBarcodeDetector;
    } else {
      delete (window as any).BarcodeDetector;
    }

    if (originalRequestAnimationFrame) {
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        value: originalRequestAnimationFrame,
      });
    } else {
      delete (window as any).requestAnimationFrame;
    }

    if (originalCancelAnimationFrame) {
      Object.defineProperty(window, 'cancelAnimationFrame', {
        configurable: true,
        value: originalCancelAnimationFrame,
      });
    } else {
      delete (window as any).cancelAnimationFrame;
    }

    if (playDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'play', playDescriptor);
    }
    if (pauseDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'pause', pauseDescriptor);
    }
    if (srcObjectDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', srcObjectDescriptor);
    } else {
      delete (HTMLMediaElement.prototype as any).srcObject;
    }
    if (readyStateDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor);
    }

    delete (HTMLMediaElement.prototype as any)._srcObject;

    jest.clearAllMocks();
  });

  it('stops media tracks when the camera toggle is switched off', async () => {
    render(<Scan onResult={jest.fn()} />);

    const startButton = await screen.findByRole('button', { name: /start camera/i });

    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    const stopButton = await screen.findByRole('button', { name: /stop camera/i });

    await act(async () => {
      fireEvent.click(stopButton);
    });

    await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
  });
});
