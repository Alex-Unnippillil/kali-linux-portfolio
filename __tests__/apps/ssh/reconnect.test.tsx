import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import SSHPreview from '../../../apps/ssh';

describe('SSH pseudo session reconnect flow', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
  let online = true;

  const updateOnline = (value: boolean) => {
    online = value;
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  };

  beforeEach(() => {
    online = true;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
  });

  afterAll(() => {
    if (originalOnLine) {
      Object.defineProperty(window.navigator, 'onLine', originalOnLine);
    }
  });

  it('shows a banner, countdown, and reopens the session after recovery', async () => {
    render(<SSHPreview />);

    expect(screen.queryByTestId('ssh-connection-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('ssh-session-status')).toHaveTextContent(/connected/i);

    await act(async () => {
      updateOnline(false);
      await Promise.resolve();
    });

    const disconnectBanner = await screen.findByTestId('ssh-connection-banner');
    expect(disconnectBanner).toHaveTextContent(/connection lost/i);
    expect(screen.getByTestId('ssh-session-status')).toHaveTextContent(/paused/i);
    expect(screen.getByTestId('ssh-session-message')).toHaveTextContent(/paused until the connection returns/i);

    await act(async () => {
      updateOnline(true);
      await Promise.resolve();
    });

    const reconnectBanner = await screen.findByTestId('ssh-connection-banner');
    expect(reconnectBanner).toHaveTextContent(/reopening session in 3/i);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
    await waitFor(() => {
      expect(screen.getByTestId('ssh-connection-banner')).toHaveTextContent(/in 2/i);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
    await waitFor(() => {
      expect(screen.getByTestId('ssh-connection-banner')).toHaveTextContent(/in 1/i);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });

    expect(screen.queryByTestId('ssh-connection-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('ssh-session-status')).toHaveTextContent(/connected/i);
    await waitFor(() => {
      expect(screen.getByTestId('ssh-session-message')).toHaveTextContent(/session reconnected/i);
    });
  });
});
