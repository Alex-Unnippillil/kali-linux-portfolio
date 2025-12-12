import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import KismetApp from '../components/apps/kismet';
import KismetPage from '../apps/kismet';

const clearLocalStorage = () => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
};

describe('KismetApp', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('shows offline summary when lab mode is disabled', async () => {
    render(<KismetApp />);
    expect(await screen.findByText(/Lab Mode off/i)).toBeInTheDocument();
    expect(screen.getByText(/Access points discovered: 4/)).toBeInTheDocument();
  });

  it('filters networks by channel selection', async () => {
    window.localStorage.setItem('lab-mode', 'true');
    render(<KismetApp />);

    const table = await screen.findByRole('table', { name: /Networks/i });
    expect(within(table).getByText('CoffeeShopWiFi')).toBeInTheDocument();

    const channelSelect = screen.getByLabelText(/Channel filter/i);
    fireEvent.change(channelSelect, { target: { value: '6' } });

    await waitFor(() => {
      expect(within(table).getByText('FreeAirport')).toBeInTheDocument();
    });
    expect(within(table).queryByText('CoffeeShopWiFi')).not.toBeInTheDocument();
  });

  it('filters client inventory by vendor', async () => {
    window.localStorage.setItem('lab-mode', 'true');
    render(<KismetApp />);

    const clientTable = await screen.findByRole('table', { name: /Client devices/i });
    expect(within(clientTable).getByText('00:11:22:33:44:55')).toBeInTheDocument();

    const vendorSelect = screen.getByLabelText(/Device vendor filter/i);
    fireEvent.change(vendorSelect, { target: { value: 'Globex' } });

    await waitFor(() => {
      expect(within(clientTable).getByText('66:77:88:99:AA:BB')).toBeInTheDocument();
    });
    expect(within(clientTable).queryByText('00:11:22:33:44:55')).not.toBeInTheDocument();
  });
});

describe('KismetPage layout', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders simulated sections with context banner', async () => {
    const { container } = render(<KismetPage />);

    expect(
      screen.getByRole('heading', { name: /Kismet Live Monitor \(Simulated\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Deauthentication Walkthrough/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/All telemetry in this workspace is replayed from bundled fixture data/i),
    ).toBeInTheDocument();

    await screen.findByText(/Access points discovered: 4/);

    expect(container).toMatchSnapshot();
  });
});
