import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import SerialTerminalApp from '../components/apps/serial-terminal';

describe('SerialTerminalApp session integration', () => {
  const requestPort = jest.fn();
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  let mockPort: {
    readable: ReadableStream<Uint8Array>;
    open: jest.Mock;
    close: jest.Mock;
    getSignals: jest.Mock;
    setSignals: jest.Mock;
  };

  class MockReader {
    private chunks: Uint8Array[];

    constructor(chunks: Uint8Array[]) {
      this.chunks = [...chunks];
    }

    async read(): Promise<{ value: Uint8Array | undefined; done: boolean }> {
      if (this.chunks.length === 0) {
        return { value: undefined, done: true };
      }
      const value = this.chunks.shift();
      return { value: value as Uint8Array, done: false };
    }

    async cancel() {
      this.chunks = [];
    }

    releaseLock() {
      this.chunks = [];
    }
  }

  const mockReadable = (chunks: Uint8Array[]): ReadableStream<Uint8Array> =>
    ({
      getReader() {
        return new MockReader(chunks);
      },
    } as unknown as ReadableStream<Uint8Array>);

  beforeEach(() => {
    const stream = mockReadable([Uint8Array.from([0xff, 0xfa, 0xf1])]);

    mockPort = {
      readable: stream,
      open: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
      getSignals: jest.fn(() => Promise.resolve({ clearToSend: false })),
      setSignals: jest.fn(() => Promise.resolve()),
    };

    requestPort.mockResolvedValue(mockPort);

    const nav = navigator as Navigator & { serial?: unknown };
    Object.defineProperty(nav, 'serial', {
      configurable: true,
      value: {
        requestPort,
        addEventListener,
        removeEventListener,
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('applies detection suggestions to the active session', async () => {
    render(<SerialTerminalApp />);

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    await waitFor(() => expect(requestPort).toHaveBeenCalled());

    await screen.findByText(/Suggested: LATIN1/i);
    const applyEncoding = await screen.findByRole('button', { name: /apply encoding/i });
    fireEvent.click(applyEncoding);
    await screen.findByText(/Active encoding: LATIN1/i);

    const rtsLabel = await screen.findByText('RTS');
    const rtsEntry = rtsLabel.closest('li') as HTMLElement;
    const applySignal = within(rtsEntry).getByRole('button', { name: /apply/i });
    fireEvent.click(applySignal);
    await waitFor(() => expect(applySignal).toHaveTextContent(/applied/i));

    expect(mockPort.setSignals).toHaveBeenCalledWith({ requestToSend: false });
  });
});
