import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import QRScanner from '../components/apps/qr';

declare global {
  interface Navigator {
    mediaDevices?: any;
  }
}

type MediaMocks = {
  getUserMedia: jest.Mock;
  enumerateDevices: jest.Mock;
};

const createStream = () => {
  const track: any = {
    stop: jest.fn(),
    getCapabilities: jest.fn().mockReturnValue({ torch: true }),
    applyConstraints: jest.fn().mockResolvedValue(undefined),
  };
  return {
    stream: {
      getVideoTracks: () => [track],
      getTracks: () => [track],
    } as MediaStream,
    track,
  };
};

const setupMediaDevices = (overrides?: Partial<MediaMocks>) => {
  const { stream } = createStream();
  const getUserMedia =
    overrides?.getUserMedia ?? jest.fn().mockResolvedValue(stream);
  const enumerateDevices =
    overrides?.enumerateDevices ??
    jest.fn().mockResolvedValue([
      { deviceId: 'cam-1', kind: 'videoinput', label: 'Rear Camera' },
      { deviceId: 'cam-2', kind: 'videoinput', label: 'Front Camera' },
    ]);

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia,
      enumerateDevices,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ondevicechange: null,
    },
    configurable: true,
  });

  return { getUserMedia, enumerateDevices };
};

const stubBarcodeDetector = () => {
  class FakeBarcodeDetector {
    detect = jest.fn().mockResolvedValue([]);
  }
  (window as any).BarcodeDetector = FakeBarcodeDetector;
};

beforeEach(() => {
  (HTMLMediaElement.prototype.play as any) = jest.fn().mockResolvedValue(undefined);
  stubBarcodeDetector();
  (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0);
  (window as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
});

afterEach(() => {
  jest.clearAllMocks();
  delete (window as any).BarcodeDetector;
  delete (navigator as any).mediaDevices;
});

describe('QRScanner camera selection', () => {
  it('renders device list with enumerated cameras', async () => {
    setupMediaDevices();
    render(<QRScanner />);

    const select = await screen.findByLabelText('Camera source');
    expect(select).toBeInTheDocument();

    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent(/Auto/);
    expect(options[1]).toHaveTextContent('Rear Camera');
    expect(options[2]).toHaveTextContent('Front Camera');
  });

  it('shows permission fallback when camera access is denied', async () => {
    const denied = jest.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    setupMediaDevices({ getUserMedia: denied });
    render(<QRScanner />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Camera access is blocked\. Enable permissions in your browser settings/i),
    ).toBeInTheDocument();
  });
});
