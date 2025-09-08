import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import SystemStatus from '../components/status/SystemStatus';

const originalFetch = global.fetch;

describe('SystemStatus', () => {
  const setNavigatorOnLine = (value: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    setNavigatorOnLine(true);
  });

  test('displays status from API', async () => {
    setNavigatorOnLine(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'All Systems Operational' }),
    } as any);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <SystemStatus />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(screen.getByText('All Systems Operational')).toBeInTheDocument(),
    );
    const link = screen.getByRole('link', { name: 'All Systems Operational' });
    expect(link).toHaveAttribute('href', 'https://status.kali.org/');
  });

  test('shows offline when navigator is offline', () => {
    setNavigatorOnLine(false);
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <SystemStatus />
      </SWRConfig>,
    );
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('handles fetch error gracefully', async () => {
    setNavigatorOnLine(true);
    global.fetch = jest.fn().mockRejectedValue(new Error('fail'));

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <SystemStatus />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(screen.getByText('Status Unavailable')).toBeInTheDocument(),
    );
  });
});

