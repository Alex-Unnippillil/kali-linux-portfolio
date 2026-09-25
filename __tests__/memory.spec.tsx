import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WebUSBApp from '../components/apps/webusb';

describe('memory regressions', () => {
  const originalUsb: unknown = (navigator as Navigator & { usb?: unknown }).usb;

  afterEach(() => {
    if (originalUsb === undefined) {
      delete (navigator as Navigator & { usb?: unknown }).usb;
    } else {
      Object.defineProperty(navigator, 'usb', {
        configurable: true,
        value: originalUsb,
      });
    }
  });

  it('cleans up WebUSB disconnect listeners on unmount', async () => {
    const listeners: Record<string, () => void> = {};
    const addEventListener = jest.fn<
      (event: 'disconnect', handler: () => void) => void
    >((event, handler) => {
      listeners[event] = handler;
    });
    const removeEventListener = jest.fn<
      (event: 'disconnect', handler: () => void) => void
    >((event, handler) => {
      if (listeners[event] === handler) {
        delete listeners[event];
      }
    });

    const mockDevice = {
      productName: 'Mock Device',
      configuration: {
        interfaces: [
          {
            alternates: [
              {
                endpoints: [
                  { direction: 'in', endpointNumber: 1 },
                  { direction: 'out', endpointNumber: 2 },
                ],
              },
            ],
          },
        ],
      },
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      selectConfiguration: jest.fn().mockResolvedValue(undefined),
      claimInterface: jest.fn().mockResolvedValue(undefined),
      transferOut: jest.fn().mockResolvedValue(undefined),
      transferIn: jest.fn().mockResolvedValue({
        data: new DataView(new ArrayBuffer(0)),
      }),
      addEventListener,
      removeEventListener,
    };

    const requestDevice = jest.fn().mockResolvedValue(mockDevice);

    Object.defineProperty(navigator, 'usb', {
      configurable: true,
      value: { requestDevice },
    });

    const { unmount } = render(<WebUSBApp />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    });

    await waitFor(() => expect(requestDevice).toHaveBeenCalled());
    await waitFor(() => expect(addEventListener).toHaveBeenCalled());

    const listener = addEventListener.mock.calls[0]?.[1];
    expect(typeof listener).toBe('function');

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('disconnect', listener);
  });
});
