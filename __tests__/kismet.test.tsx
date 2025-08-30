import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KismetApp from '../components/apps/kismet';

describe('KismetApp', () => {
  it('steps through sample capture frames', async () => {
    const user = userEvent.setup();
    render(<KismetApp />);
    await user.click(screen.getByRole('button', { name: /load sample/i }));
    await user.click(screen.getByRole('button', { name: /step/i }));
    expect(screen.getAllByText('CoffeeShopWiFi')[0]).toBeInTheDocument();
  });

  it('invokes onNetworkDiscovered with network info', async () => {
    const user = userEvent.setup();
    const onNetworkDiscovered = jest.fn();
    render(<KismetApp onNetworkDiscovered={onNetworkDiscovered} />);
    await user.click(screen.getByRole('button', { name: /load sample/i }));
    await user.click(screen.getByRole('button', { name: /step/i }));
    expect(onNetworkDiscovered).toHaveBeenCalledWith(
      expect.objectContaining({
        ssid: 'CoffeeShopWiFi',
        bssid: '66:77:88:00:00:01',
        discoveredAt: expect.any(Number),
      })
    );
  });
});
