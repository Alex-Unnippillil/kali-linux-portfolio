import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KismetApp from '../components/apps/kismet';

describe('KismetApp', () => {
  it.skip('steps through sample capture frames', async () => {
    const user = userEvent.setup();
    render(<KismetApp />);
    await user.click(screen.getByRole('button', { name: /load sample/i }));
    await user.click(screen.getByRole('button', { name: /step/i }));
    const nets = await screen.findAllByText('CoffeeShopWiFi');
    expect(nets.length).toBeGreaterThan(0);
  });
});
