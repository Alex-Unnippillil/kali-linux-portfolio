import React from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react';
import CryptoToolkit from '../../../apps/crypto-toolkit';

const FIVE_MB_BYTES = 5 * 1024 * 1024;

describe('CryptoToolkit hashing panel', () => {
  const originalWorker = global.Worker;
  const originalClipboard = navigator.clipboard;
  let writeTextMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage = jest.fn(() => {
        setTimeout(() => {
          this.onmessage?.({
            data: { type: 'progress', loaded: 2, total: 4 },
          } as MessageEvent<unknown>);
        }, 10);
        setTimeout(() => {
          this.onmessage?.({
            data: {
              type: 'result',
              results: {
                MD5: 'md5-hash',
                'SHA-1': 'sha1-hash',
                'SHA-256': 'sha256-hash',
              },
            },
          } as MessageEvent<unknown>);
        }, 20);
      });
      terminate = jest.fn();
    }

    // @ts-ignore
    global.Worker = MockWorker;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (navigator as any).clipboard;
    }
    if (originalWorker) {
      global.Worker = originalWorker;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).Worker;
    }
  });

  it('streams progress updates and renders worker digests', async () => {
    const { getByLabelText, getByRole, getByTestId } = render(<CryptoToolkit />);

    await act(async () => {
      fireEvent.change(getByLabelText(/Text to hash/i), {
        target: { value: 'hello world' },
      });
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /hash text/i }));
    });

    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    await waitFor(() =>
      expect(getByTestId('hash-progress')).toHaveTextContent('50%'),
    );

    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    await waitFor(() =>
      expect(getByTestId('hash-progress')).toHaveTextContent('100%'),
    );

    expect(getByTestId('hash-output-MD5')).toHaveValue('md5-hash');
    expect(getByTestId('hash-output-SHA-1')).toHaveValue('sha1-hash');
    expect(getByTestId('hash-output-SHA-256')).toHaveValue('sha256-hash');

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /copy md5 hash/i }));
    });

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('md5-hash'));
  });

  it('prevents hashing when a file exceeds 5 MB', async () => {
    const workerSpy = jest.fn();

    class GuardWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage = workerSpy;
      terminate() {
        /* noop */
      }
    }

    // @ts-ignore
    global.Worker = GuardWorker;

    const { getByLabelText, getByText } = render(<CryptoToolkit />);

    const fileInput = getByLabelText(/upload file/i) as HTMLInputElement;
    const oversized = new File([new Uint8Array(FIVE_MB_BYTES + 1)], 'huge.bin');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [oversized] } });
    });

    expect(workerSpy).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByText(/exceeds the 5 MB limit/i)).toBeInTheDocument(),
    );
  });
});
