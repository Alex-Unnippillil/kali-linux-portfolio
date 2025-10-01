import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { setKillSwitch, resetKillSwitches } from '../flags';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('kill switch integration', () => {
  beforeEach(async () => {
    await resetKillSwitches();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  function Consumer({ label }: { label: string }) {
    const { allowNetwork, setAllowNetwork, networkKillSwitchActive } = useSettings();
    return (
      <div>
        <div data-testid={`${label}-allow`}>{String(allowNetwork)}</div>
        <div data-testid={`${label}-kill`}>{String(networkKillSwitchActive)}</div>
        <button type="button" onClick={() => setAllowNetwork(true)}>
          enable-{label}
        </button>
        <button type="button" onClick={() => setAllowNetwork(false)}>
          disable-{label}
        </button>
      </div>
    );
  }

  it('forces allowNetwork to false when the kill switch is active', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <Consumer label="primary" />
      </SettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('primary-allow')).toHaveTextContent('false'));
    await user.click(screen.getByText('enable-primary'));
    await waitFor(() => expect(screen.getByTestId('primary-allow')).toHaveTextContent('true'));

    await act(async () => {
      await setKillSwitch('networkAccess', true);
    });

    await waitFor(() => expect(screen.getByTestId('primary-kill')).toHaveTextContent('true'));
    await waitFor(() => expect(screen.getByTestId('primary-allow')).toHaveTextContent('false'));

    await user.click(screen.getByText('enable-primary'));
    await waitFor(() => expect(screen.getByTestId('primary-allow')).toHaveTextContent('false'));

    await act(async () => {
      await setKillSwitch('networkAccess', false);
    });

    await waitFor(() => expect(screen.getByTestId('primary-kill')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('primary-allow')).toHaveTextContent('true'));
  });

  it('broadcasts kill switch updates across providers without reload', async () => {
    render(
      <>
        <SettingsProvider>
          <Consumer label="one" />
        </SettingsProvider>
        <SettingsProvider>
          <Consumer label="two" />
        </SettingsProvider>
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('one-allow')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('two-allow')).toHaveTextContent('false'));

    await act(async () => {
      await setKillSwitch('networkAccess', true);
    });

    await waitFor(() => expect(screen.getByTestId('one-kill')).toHaveTextContent('true'));
    await waitFor(() => expect(screen.getByTestId('two-kill')).toHaveTextContent('true'));
    await waitFor(() => expect(screen.getByTestId('two-allow')).toHaveTextContent('false'));

    await act(async () => {
      await setKillSwitch('networkAccess', false);
    });

    await waitFor(() => expect(screen.getByTestId('one-kill')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('two-kill')).toHaveTextContent('false'));
  });
});
