import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PairDialog from '../components/PairDialog';

describe('PairDialog', () => {
  it('surfaced permission help when access is denied', async () => {
    const requestDevice = jest
      .fn()
      .mockRejectedValue(new DOMException('User cancelled the prompt', 'NotAllowedError'));

    render(<PairDialog open bluetooth={{ requestDevice }} onClose={() => {}} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /connect/i }));

    const messages = await screen.findAllByText(
      /Permission to use Bluetooth devices was denied./i,
    );

    expect(messages.length).toBeGreaterThan(0);

    expect(
      screen.getByRole('link', { name: /review site permissions/i }),
    ).toBeInTheDocument();
  });

  it('attempts to reconnect automatically after a transient disconnect', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const connectMock = jest
      .fn<Promise<unknown>, []>()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('temporary drop'))
      .mockResolvedValueOnce({});

    class MockDevice extends EventTarget {
      name = 'Test Device';
      gatt = { connect: connectMock };
    }

    const device = new MockDevice();
    const requestDevice = jest.fn().mockResolvedValue(device);

    render(<PairDialog open bluetooth={{ requestDevice }} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));

    act(() => {
      device.dispatchEvent(new Event('gattserverdisconnected'));
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(3));

    await waitFor(() =>
      expect(
        screen.getByText(/Connection restored with Test Device/i),
      ).toBeInTheDocument(),
    );

    jest.useRealTimers();
  });
});
