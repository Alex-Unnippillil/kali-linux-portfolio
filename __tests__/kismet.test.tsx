import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import KismetApp from '../components/apps/kismet.jsx';

describe('KismetApp', () => {
  const originalClipboard = (navigator as any).clipboard;

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator as any, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as any).clipboard;
    }
  });

  it('renders file input', () => {
    render(<KismetApp />);
    expect(screen.getByLabelText(/pcap file/i)).toBeInTheDocument();
  });

  it('copies network details from the tooltip', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator as any, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <KismetApp
        initialCapture={[{
          ssid: 'TestNet',
          bssid: '00:11:22:33:44:55',
          channel: 6,
          signal: -42,
        }]}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: /show network details for testnet/i,
    });
    fireEvent.click(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('w-64');

    fireEvent.click(screen.getByRole('button', { name: /copy mac address/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('00:11:22:33:44:55'),
    );

    fireEvent.click(screen.getByRole('button', { name: /copy vendor/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Acme Corp'));

    fireEvent.click(screen.getByRole('button', { name: /copy rssi/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('-42 dBm'));

    expect(writeText).toHaveBeenCalledTimes(3);
  });
});
