import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import AboutApp from '../components/apps/About';

describe('release channel settings', () => {
  const originalDefaultChannel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL;

  beforeEach(() => {
    window.localStorage.clear();
    process.env.NEXT_PUBLIC_DEFAULT_CHANNEL = 'stable';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_DEFAULT_CHANNEL = originalDefaultChannel;
  });

  it('persists the release channel per profile', async () => {
    window.localStorage.setItem('profile:active', 'pentest');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.releaseChannel).toBe('stable'));

    act(() => {
      result.current.setReleaseChannel('preview');
    });

    expect(window.localStorage.getItem('release-channel:pentest')).toBe('preview');
  });

  it('shows a restart prompt after switching channels', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <AboutApp />
      </SettingsProvider>,
    );

    const toggle = await screen.findByRole('switch', { name: /release channel/i });
    await user.click(toggle);

    expect(
      screen.getByText(/restart required to finish switching/i),
    ).toBeInTheDocument();
  });
});
