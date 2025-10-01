import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import { SafeModeProvider, useSafeMode } from '../components/common/SafeMode';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <NotificationCenter>
      <SafeModeProvider>{ui}</SafeModeProvider>
    </NotificationCenter>,
  );

beforeEach(() => {
  localStorage.clear();
});

describe('Safe Mode provider', () => {
  it('requires acknowledgement before disabling safe mode', () => {
    const Harness = () => {
      const { requestDisable, enabled } = useSafeMode();
      return (
        <div>
          <div data-testid="status">{enabled ? 'on' : 'off'}</div>
          <button type="button" onClick={() => requestDisable({})}>
            disable
          </button>
        </div>
      );
    };

    renderWithProviders(<Harness />);
    expect(screen.getByTestId('status')).toHaveTextContent('on');

    fireEvent.click(screen.getByText('disable'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const exitButton = screen.getByRole('button', { name: /exit safe mode/i });
    expect(exitButton).toBeDisabled();

    const acknowledgement = screen.getByLabelText(
      /Acknowledge Safe Mode exit requirements/i,
    );
    fireEvent.click(acknowledgement);
    expect(exitButton).toBeEnabled();

    fireEvent.click(exitButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('off');
  });

  it('blocks sensitive actions and surfaces messaging when Safe Mode is active', () => {
    const GuardHarness = () => {
      const { guardSensitiveAction } = useSafeMode();
      const [count, setCount] = useState(0);
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              if (
                guardSensitiveAction({
                  action: 'test:action',
                  appId: 'test-app',
                  summary: 'Test action blocked',
                  details: 'Safe Mode prevented the simulated exploit.',
                })
              ) {
                setCount((value) => value + 1);
              }
            }}
          >
            trigger
          </button>
          <div data-testid="count">{count}</div>
        </div>
      );
    };

    renderWithProviders(<GuardHarness />);
    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByText('Blocked by Safe Mode')).toBeInTheDocument();
    expect(screen.getByText('Test action blocked')).toBeInTheDocument();
    expect(screen.getByText(/Last blocked action:/i)).toHaveTextContent(
      'Test action blocked',
    );
  });
});
