import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

function DensityTester() {
  const { density, setDensity, densityPreferences, densityBreakpoint } =
    useSettings();
  return (
    <div>
      <span data-testid="density-value">{density}</span>
      <span data-testid="density-breakpoint">{densityBreakpoint}</span>
      <span data-testid="density-map">{JSON.stringify(densityPreferences)}</span>
      <button type="button" onClick={() => setDensity('compact')}>
        set-compact
      </button>
      <button type="button" onClick={() => setDensity('regular')}>
        set-regular
      </button>
    </div>
  );
}

describe('density preferences per breakpoint', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });
  });

  const resizeWindow = async (width: number) => {
    await act(async () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
        writable: true,
      });
      window.dispatchEvent(new Event('resize'));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it('keeps density selections scoped to the active breakpoint', async () => {
    const user = userEvent.setup();

    await resizeWindow(1600);

    render(
      <SettingsProvider>
        <DensityTester />
      </SettingsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('density-value')).toHaveTextContent('regular'),
    );
    expect(screen.getByTestId('density-breakpoint')).toHaveTextContent('large');

    await user.click(screen.getByRole('button', { name: 'set-compact' }));

    await waitFor(() =>
      expect(screen.getByTestId('density-value')).toHaveTextContent('compact'),
    );

    const mapAfterLarge = JSON.parse(
      screen.getByTestId('density-map').textContent ?? '{}',
    );
    expect(mapAfterLarge.large).toBe('compact');
    expect(mapAfterLarge.small).toBe('regular');

    await resizeWindow(900);

    await waitFor(() =>
      expect(screen.getByTestId('density-value')).toHaveTextContent('regular'),
    );
    expect(screen.getByTestId('density-breakpoint')).toHaveTextContent('small');

    const mapAfterSmall = JSON.parse(
      screen.getByTestId('density-map').textContent ?? '{}',
    );
    expect(mapAfterSmall.small).toBe('regular');

    await resizeWindow(1600);

    await waitFor(() =>
      expect(screen.getByTestId('density-value')).toHaveTextContent('compact'),
    );
    expect(screen.getByTestId('density-breakpoint')).toHaveTextContent('large');

    const mapAfterReturn = JSON.parse(
      screen.getByTestId('density-map').textContent ?? '{}',
    );
    expect(mapAfterReturn.large).toBe('compact');
  });
});
