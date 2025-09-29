import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SerialTerminalApp from '../components/apps/serial-terminal';

const originalSerialDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'serial'
);

type DisconnectListener = (event: Event & { readonly target: SerialPortMock }) => void;

interface SerialPortMock {
  readable: {
    getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  } | null;
  open: jest.Mock<Promise<void>, [{ baudRate: number }]>;
  close: jest.Mock<Promise<void>, []>;
}

const createSerialMocks = (openMock: SerialPortMock['open']) => {
  const reader = {
    read: jest.fn().mockResolvedValue({ value: undefined, done: true }),
    releaseLock: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;

  const port: SerialPortMock = {
    readable: {
      getReader: () => reader,
    },
    open: openMock,
    close: jest.fn().mockResolvedValue(undefined),
  };

  const disconnectListeners = new Set<DisconnectListener>();

  const serial = {
    requestPort: jest.fn().mockResolvedValue(port),
    addEventListener: jest.fn((type: string, listener: DisconnectListener) => {
      if (type === 'disconnect') {
        disconnectListeners.add(listener);
      }
    }),
    removeEventListener: jest.fn((type: string, listener: DisconnectListener) => {
      if (type === 'disconnect') {
        disconnectListeners.delete(listener);
      }
    }),
  };

  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: serial,
  });

  const emitDisconnect = () => {
    disconnectListeners.forEach((listener) =>
      listener({ target: port } as Event & { readonly target: SerialPortMock })
    );
  };

  return { port, serial, emitDisconnect };
};

describe('SerialTerminalApp reconnection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalSerialDescriptor) {
      Object.defineProperty(navigator, 'serial', originalSerialDescriptor);
    } else {
      delete (navigator as Navigator & { serial?: unknown }).serial;
    }
  });

  it('attempts reconnection quickly with exponential backoff and shows success toast', async () => {
    const openMock = jest
      .fn<Promise<void>, [{ baudRate: number }]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    const { serial, emitDisconnect } = createSerialMocks(openMock);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<SerialTerminalApp />);

    await user.click(screen.getByRole('button', { name: /connect/i }));
    await waitFor(() => expect(serial.requestPort).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(openMock).toHaveBeenCalledTimes(1));

    await screen.findByRole('button', { name: /disconnect/i });
    await screen.findByText('Connected to device.');

    act(() => {
      emitDisconnect();
    });

    expect(
      screen.getByText('Device disconnected. Attempting to reconnect...')
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(openMock).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText('Reconnect attempt 1 failed. Retrying...')
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(openMock).toHaveBeenCalledTimes(3);
    await screen.findByText('Reconnected to device.');
  });

  it('stops after repeated failures and informs the user', async () => {
    const openMock = jest
      .fn<Promise<void>, [{ baudRate: number }]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error('permanent failure'));

    const { serial, emitDisconnect } = createSerialMocks(openMock);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<SerialTerminalApp />);

    await user.click(screen.getByRole('button', { name: /connect/i }));
    await waitFor(() => expect(serial.requestPort).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(openMock).toHaveBeenCalledTimes(1));

    act(() => {
      emitDisconnect();
    });

    const delays = [500, 1000, 2000, 3000, 3000];
    for (const delay of delays) {
      await act(async () => {
        jest.advanceTimersByTime(delay);
        await Promise.resolve();
      });
    }

    expect(openMock).toHaveBeenCalledTimes(1 + delays.length);
    await screen.findByText('Failed to reconnect. Please reconnect manually.');
  });
});
