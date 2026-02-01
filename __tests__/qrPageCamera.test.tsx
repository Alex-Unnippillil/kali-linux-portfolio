import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QRPage from '../pages/qr';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,qr')),
  toString: jest.fn(() => Promise.resolve('<svg></svg>')),
}));

const mockStream = {
  getTracks: () => [{ stop: jest.fn() }],
} as unknown as MediaStream;

const mockGetUserMedia = jest.fn(() => Promise.resolve(mockStream));
const mockEnumerateDevices = jest.fn(() =>
  Promise.resolve([
    {
      deviceId: 'camera-1',
      kind: 'videoinput',
      label: 'Front Camera',
      groupId: 'group-1',
      toJSON: () => ({}),
    },
    {
      deviceId: 'camera-2',
      kind: 'videoinput',
      label: 'Rear Camera',
      groupId: 'group-1',
      toJSON: () => ({}),
    },
  ] as MediaDeviceInfo[]),
);

describe('QR page utilities', () => {
  beforeAll(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  });

  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices = {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
    } as MediaDevices;
    (window as any).BarcodeDetector = class BarcodeDetector {
      detect = jest.fn(() => Promise.resolve([]));
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetUserMedia.mockClear();
    mockEnumerateDevices.mockClear();
  });

  it('enables the download button after generating a QR code', async () => {
    render(<QRPage />);

    const downloadButton = screen.getByRole('button', {
      name: /download qr image/i,
    });

    expect(downloadButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'hello world' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => expect(downloadButton).toBeEnabled());
  });

  it('requests the selected camera input', async () => {
    render(<QRPage />);

    const cameraSelect = screen.getByLabelText('Camera');

    await waitFor(() => {
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });

    fireEvent.change(cameraSelect, { target: { value: 'camera-2' } });

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenLastCalledWith({
        video: { deviceId: { exact: 'camera-2' } },
      });
    });
  });
});
