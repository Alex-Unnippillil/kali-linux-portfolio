import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import NetworkInsights from '../apps/resource-monitor/components/NetworkInsights';
import { SettingsProvider } from '../hooks/useSettings';
import NotificationCenter from '../components/common/NotificationCenter';

describe('NetworkInsights routing preferences', () => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SettingsProvider>
      <NotificationCenter title="Routed alerts" emptyMessage="No alerts routed yet.">
        {children}
      </NotificationCenter>
    </SettingsProvider>
  );

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists the selected alert route via useSettings', async () => {
    render(<NetworkInsights />, { wrapper: Wrapper });

    const select = screen.getByLabelText(/alert routing/i);
    fireEvent.change(select, { target: { value: 'network' } });

    await waitFor(() => expect(window.localStorage.getItem('ops-route')).toBe('network'));
    expect(select).toHaveValue('network');
  });

  it('routes notifications to the currently selected destination', async () => {
    render(<NetworkInsights />, { wrapper: Wrapper });

    const select = screen.getByLabelText(/alert routing/i);
    fireEvent.change(select, { target: { value: 'network' } });
    await waitFor(() => expect(window.localStorage.getItem('ops-route')).toBe('network'));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('fetchproxy-end', {
          detail: {
            id: 1,
            method: 'GET',
            url: '/api/test-network',
            duration: 5005,
          },
        }),
      );
    });

    const networkHeading = await screen.findByRole('heading', {
      level: 3,
      name: 'Network On-Call',
    });
    const networkGroup = networkHeading.closest('section');
    expect(networkGroup).not.toBeNull();
    if (!networkGroup) throw new Error('Missing network notification group');
    expect(networkGroup).toHaveTextContent('Slow 5005ms');
    expect(networkGroup).toHaveTextContent('/api/test-network');

    fireEvent.change(select, { target: { value: 'security' } });
    await waitFor(() => expect(window.localStorage.getItem('ops-route')).toBe('security'));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('fetchproxy-end', {
          detail: {
            id: 2,
            method: 'POST',
            url: '/api/incident',
            status: 503,
            duration: 1200,
          },
        }),
      );
    });

    const securityHeading = await screen.findByRole('heading', {
      level: 3,
      name: 'Security Response',
    });
    const securityGroup = securityHeading.closest('section');
    expect(securityGroup).not.toBeNull();
    if (!securityGroup) throw new Error('Missing security notification group');
    expect(securityGroup).toHaveTextContent('HTTP 503');
    expect(securityGroup).toHaveTextContent('/api/incident');

    const networkItems = within(networkGroup).getAllByRole('listitem');
    expect(networkItems).toHaveLength(1);
    const securityItems = within(securityGroup).getAllByRole('listitem');
    expect(securityItems).toHaveLength(1);
  });
});
