import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VpnManager from '../../../components/apps/vpn-manager';
import { resetNetworkState } from '../../../utils/networkState';
import { logEvent } from '../../../utils/analytics';

jest.mock('../../../utils/vpnStorage', () => {
  let storedProfiles = [
    {
      id: 'profile-1',
      name: 'Lab VPN',
      type: 'openvpn',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      leakTests: [],
      openVpn: {
        type: 'openvpn',
        remote: 'vpn.example.com',
        port: 1194,
        protocol: 'udp',
        auth: 'username/password',
        cipher: 'AES-256',
        options: { remote: 'vpn.example.com 1194' },
        blocks: {},
      },
    },
  ];

  return {
    __esModule: true,
    loadProfiles: jest.fn(async () => storedProfiles),
    saveProfiles: jest.fn(async (next) => {
      storedProfiles = next;
    }),
    clearProfiles: jest.fn(async () => {
      storedProfiles = [];
    }),
    __setProfiles: (profiles: typeof storedProfiles) => {
      storedProfiles = profiles;
    },
  };
});

jest.mock('../../../utils/analytics', () => ({
  __esModule: true,
  logEvent: jest.fn(),
}));

describe('VPN Manager component', () => {
const storageMock = jest.requireMock(
  '../../../utils/vpnStorage',
) as {
  __setProfiles: (profiles: any[]) => void;
};

  beforeEach(() => {
    resetNetworkState();
    storageMock.__setProfiles([
      {
        id: 'profile-1',
        name: 'Lab VPN',
        type: 'openvpn',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        leakTests: [],
        openVpn: {
          type: 'openvpn',
          remote: 'vpn.example.com',
          port: 1194,
          protocol: 'udp',
          auth: 'username/password',
          cipher: 'AES-256',
          options: { remote: 'vpn.example.com 1194' },
          blocks: {},
        },
      },
    ]);
    (logEvent as jest.Mock).mockClear();
    window.localStorage.clear();
  });

  it('toggles the kill switch and updates the displayed IP when disconnected', async () => {
    const user = userEvent.setup();
    render(<VpnManager />);

    await screen.findByText('Lab VPN');
    expect(screen.getByText(/Kill switch: Disabled/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Enable kill switch/i }));

    await waitFor(() => {
      expect(screen.getByText(/Kill switch: Enabled/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Current IP: 0\.0\.0\.0/)).toBeInTheDocument();
  });

  it('logs a metric when a leak test passes after connecting', async () => {
    const user = userEvent.setup();
    render(<VpnManager />);

    await screen.findByText('Lab VPN');

    await user.click(screen.getByRole('button', { name: /Connect/i }));

    await user.click(screen.getByRole('button', { name: /Run leak test/i }));

    await screen.findByText(/No leaks detected/i);
    expect(logEvent).toHaveBeenCalledWith({
      category: 'VPN Manager',
      action: 'leak-test-pass',
      label: 'Lab VPN',
    });
  });
});
