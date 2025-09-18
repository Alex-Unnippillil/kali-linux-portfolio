import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ListView from '../apps/reaver/components/ListView';

const sampleAccessPoints = [
  { ssid: 'CafeWiFi', bssid: '00:11:22:33:44:55', wps: 'enabled' as const },
  { ssid: 'HomeSecure', bssid: '66:77:88:99:AA:BB', wps: 'locked' as const },
];

const originalFetch = global.fetch;

describe('Reaver access point list view', () => {
  beforeEach(() => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(sampleAccessPoints),
    } as Response;

    global.fetch = jest
      .fn()
      .mockResolvedValue(mockResponse) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (global as typeof global & { fetch?: typeof fetch }).fetch;
    }
  });

  it('shows skeleton while loading and renders access points after fetch', async () => {
    render(<ListView />);
    const section = screen.getByLabelText('Access point list');

    expect(section).toHaveAttribute('aria-busy', 'true');

    await screen.findByText('CafeWiFi');

    await waitFor(() => expect(section).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getByText('HomeSecure')).toBeInTheDocument();
  });
});
