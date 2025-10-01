import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import ImageViewer from '../components/common/ImageViewer';

const parseMock = jest.fn();
const rotationMock = jest.fn();

jest.mock('exifr', () => ({
  __esModule: true,
  parse: (...args: unknown[]) => parseMock(...args),
  rotation: (...args: unknown[]) => rotationMock(...args),
}));

const openMock = jest.fn();
const metadataMock = jest.fn();
const imageDataMock = jest.fn();

const DecoderMock = jest.fn().mockImplementation(() => ({
  open: openMock,
  metadata: metadataMock,
  imageData: imageDataMock,
}));

jest.mock('libraw-wasm', () => ({
  __esModule: true,
  default: DecoderMock,
}));

declare global {
  interface Window {
    Worker?: typeof Worker;
  }
}

describe('ImageViewer', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  const originalWorker = global.Worker;
  const originalIntersectionObserver = global.IntersectionObserver;

  beforeEach(() => {
    parseMock.mockReset();
    rotationMock.mockReset();
    openMock.mockReset();
    metadataMock.mockReset();
    imageDataMock.mockReset();
    DecoderMock.mockClear();

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    class MockObserver {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe = (target: Element) => {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      };
      disconnect = jest.fn();
      unobserve = jest.fn();
      takeRecords = jest.fn(() => []);
    }
    global.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
    global.Worker = originalWorker;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    global.Worker = originalWorker;
    if (originalIntersectionObserver) {
      global.IntersectionObserver = originalIntersectionObserver;
    }
  });

  it('applies EXIF orientation and displays camera details', async () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    (blob as File & { name?: string }).name = 'photo.jpg';
    parseMock.mockResolvedValue({
      Orientation: 6,
      Make: 'Canon',
      Model: 'EOS R5',
      LensModel: 'RF 24-70mm',
      ISO: 200,
      ExposureTime: 0.01,
      FNumber: 4,
      FocalLength: 35,
      DateTimeOriginal: '2024:01:01 12:00:00',
    });
    rotationMock.mockResolvedValue({
      deg: 90,
      scaleX: 1,
      scaleY: 1,
    });

    render(<ImageViewer source={blob} showMetadataByDefault />);

    await waitFor(() => expect(screen.getByTestId('image-viewer-image')).toBeInTheDocument());
    const image = screen.getByTestId('image-viewer-image') as HTMLImageElement;
    expect(image).toHaveAttribute('src', 'blob:mock-url');
    expect(image.style.transform).toContain('rotate(90deg)');

    expect(await screen.findByText(/Canon EOS R5/)).toBeInTheDocument();
    expect(screen.getByText(/Lens/)).toBeInTheDocument();
    await waitFor(() => expect(parseMock).toHaveBeenCalled());
  });

  it('falls back gracefully when RAW decoding is not available', async () => {
    const blob = new Blob(['raw'], { type: 'application/octet-stream' });
    (blob as File & { name?: string }).name = 'capture.cr2';
    parseMock.mockResolvedValue({});
    rotationMock.mockResolvedValue(null);
    global.Worker = undefined as unknown as typeof Worker;

    render(<ImageViewer source={blob} showMetadataByDefault />);

    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert).toHaveTextContent(/RAW preview is unavailable/i);
    expect(screen.queryByTestId('image-viewer-image')).not.toBeInTheDocument();
    await waitFor(() => expect(parseMock).toHaveBeenCalled());
  });

  it('provides accessible controls for screen readers', async () => {
    const blob = new Blob(['test'], { type: 'image/png' });
    (blob as File & { name?: string }).name = 'picture.png';
    parseMock.mockResolvedValue({});
    rotationMock.mockResolvedValue(null);

    render(<ImageViewer source={blob} lazy={false} />);

    await waitFor(() => expect(screen.getByRole('toolbar', { name: /image controls/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle metadata/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
