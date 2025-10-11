import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SerialTerminalApp from '../components/apps/serial-terminal';
import { createSerialTransportStub } from '../utils/serialTransportStub';

describe('SerialTerminalApp', () => {
  it('falls back to the demo serial transport when the Web Serial API is unavailable', async () => {
    const user = userEvent.setup();
    render(<SerialTerminalApp />);

    expect(
      screen.getByText('Running in demo mode with a simulated serial device.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /connect/i }));

    await screen.findByText(/\[demo\] Web Serial API not available/i);
    expect(await screen.findByText(/Status: Connected/i)).toBeInTheDocument();
  });

  it('surfaces disconnect events from stubbed serial transports', async () => {
    const user = userEvent.setup();
    const stub = createSerialTransportStub({ script: ['[stub] ready'] });
    const originalSerial = (navigator as Navigator & { serial?: unknown }).serial;

    Object.defineProperty(navigator, 'serial', {
      configurable: true,
      value: stub.serial,
    });

    try {
      render(<SerialTerminalApp />);

      await user.click(screen.getByRole('button', { name: /connect/i }));
      await screen.findByText(/\[stub] ready/i);

      await act(async () => {
        await stub.disconnect();
      });

      expect(
        await screen.findByText('Device disconnected.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Status: Not connected/i)).toBeInTheDocument();
    } finally {
      if (originalSerial === undefined) {
        delete (navigator as Navigator & { serial?: unknown }).serial;
      } else {
        Object.defineProperty(navigator, 'serial', {
          configurable: true,
          value: originalSerial,
        });
      }
    }
  });
});
