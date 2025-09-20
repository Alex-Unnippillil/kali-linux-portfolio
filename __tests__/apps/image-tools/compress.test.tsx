import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImageToolsApp from '../../../apps/image-tools';

declare global {
  interface Window {
    URL: {
      createObjectURL: jest.Mock<string, [Blob | MediaSource]>;
      revokeObjectURL: jest.Mock<void, [string]>;
    };
  }
}

class MockWorker {
  public onmessage: ((event: MessageEvent<any>) => void) | null = null;

  public postMessage = jest.fn();

  public terminate = jest.fn();

  public addEventListener = jest.fn(
    (type: string, listener: (event: MessageEvent<any>) => void) => {
      if (type === 'message') {
        this.listeners.add(listener);
      }
    },
  );

  public removeEventListener = jest.fn(
    (type: string, listener: (event: MessageEvent<any>) => void) => {
      if (type === 'message') {
        this.listeners.delete(listener);
      }
    },
  );

  private listeners = new Set<(event: MessageEvent<any>) => void>();

  emit(data: any) {
    const event = { data } as MessageEvent<any>;
    this.onmessage?.(event);
    this.listeners.forEach((listener) => listener(event));
  }
}

describe('Image compression worker integration', () => {
  const workers: MockWorker[] = [];
  let objectUrlCounter = 0;

  beforeEach(() => {
    workers.length = 0;
    objectUrlCounter = 0;
    global.URL.createObjectURL = jest.fn(() => `blob:mock-${objectUrlCounter++}`);
    global.URL.revokeObjectURL = jest.fn();
    (global as any).Worker = jest.fn(() => {
      const worker = new MockWorker();
      workers.push(worker);
      return worker;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createLargeFile = () =>
    new File([new Uint8Array(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

  const latestWorker = () => {
    if (workers.length === 0) {
      throw new Error('Worker was not instantiated');
    }
    return workers[workers.length - 1];
  };

  it('updates progress and estimates once the worker reports metadata', async () => {
    render(<ImageToolsApp />);

    const fileInput = screen.getByLabelText(/select an image/i);
    const file = createLargeFile();
    fireEvent.change(fileInput, { target: { files: [file] } });

    const worker = latestWorker();
    await waitFor(() => expect(worker.postMessage).toHaveBeenCalled());
    const [{ id }] = worker.postMessage.mock.calls.at(-1) as [{ id: string }];

    act(() => {
      worker.emit({
        id,
        type: 'progress',
        progress: 0.42,
        originalWidth: 4032,
        originalHeight: 3024,
        targetWidth: 1920,
        targetHeight: 1440,
        scaleFactor: 1920 / 4032,
      });
    });

    expect(screen.getByTestId('compression-progress')).toHaveTextContent('42%');

    await waitFor(() => {
      const estimatedNode = screen.getByTestId('estimated-size');
      const valueMatch = estimatedNode.textContent?.match(/~\s*([\d.]+)\s*(KB|MB)/i);
      expect(valueMatch).not.toBeNull();
      const numeric = Number(valueMatch?.[1]);
      const unit = valueMatch?.[2].toUpperCase();
      const sizeInMb = unit === 'KB' ? numeric / 1024 : numeric;
      expect(sizeInMb).toBeGreaterThan(0.5);
      expect(sizeInMb).toBeLessThan(1.5);
    });
  });

  it('provides a downloadable link with the compressed payload', async () => {
    render(<ImageToolsApp />);

    const fileInput = screen.getByLabelText(/select an image/i);
    const file = createLargeFile();
    fireEvent.change(fileInput, { target: { files: [file] } });

    const worker = latestWorker();
    await waitFor(() => expect(worker.postMessage).toHaveBeenCalled());
    const [{ id }] = worker.postMessage.mock.calls.at(-1) as [{ id: string }];

    act(() => {
      worker.emit({
        id,
        type: 'progress',
        progress: 0.6,
        originalWidth: 4032,
        originalHeight: 3024,
        targetWidth: 1920,
        targetHeight: 1440,
        scaleFactor: 1920 / 4032,
      });
    });

    const compressedBuffer = new ArrayBuffer(1024 * 1024);
    act(() => {
      worker.emit({
        id,
        type: 'complete',
        buffer: compressedBuffer,
        size: compressedBuffer.byteLength,
        targetWidth: 1920,
        targetHeight: 1440,
        format: 'image/jpeg',
      });
    });

    await waitFor(() => {
      const text = screen.getByTestId('compressed-size').textContent ?? '';
      const match = text.match(/([\d.]+)\s*MB/);
      expect(match).not.toBeNull();
      expect(Number(match?.[1])).toBeCloseTo(1, 1);
    });

    const downloadLink = screen.getByRole('link', { name: /download compressed/i });
    expect(downloadLink).toHaveAttribute('href', 'blob:mock-1');
    expect(downloadLink).toHaveAttribute('download', 'compressed-large.jpg');

    expect(screen.getByTestId('compression-progress')).toHaveTextContent('100%');
  });
});
