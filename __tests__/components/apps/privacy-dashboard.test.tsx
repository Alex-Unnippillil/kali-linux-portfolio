import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PrivacyDashboard from '../../../components/apps/privacy-dashboard';
import { SettingsProvider, useSettings } from '../../../hooks/useSettings';
import { resetPrivacyRegistry, useAppPrivacy } from '../../../utils/privacyRegistry';

describe('PrivacyDashboard', () => {
  const originalFetch = global.fetch;

  const createStorage = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  };

  beforeAll(() => {
    if (!global.fetch) {
      // @ts-expect-error window.fetch is not defined in jsdom by default
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    }
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    resetPrivacyRegistry();
    Object.defineProperty(window, 'localStorage', {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
    window.fetch = global.fetch;
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  function ClipboardObserver() {
    const { permissions } = useAppPrivacy('security-tools');
    return <div data-testid="clipboard-state">{permissions.clipboard ? 'on' : 'off'}</div>;
  }

  function SettingsObserver() {
    const { telemetry, diagnostics } = useSettings();
    return (
      <div>
        <span data-testid="telemetry-state">{telemetry ? 'on' : 'off'}</span>
        <span data-testid="diagnostics-state">{diagnostics ? 'on' : 'off'}</span>
      </div>
    );
  }

  test('revoking clipboard permission updates registry subscribers', () => {
    render(
      <Wrapper>
        <PrivacyDashboard />
        <ClipboardObserver />
      </Wrapper>,
    );

    const clipboardSwitch = screen.getByRole('switch', {
      name: /Security Tools Clipboard permission/i,
    });
    expect(clipboardSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('clipboard-state')).toHaveTextContent('on');

    fireEvent.click(clipboardSwitch);

    expect(clipboardSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('clipboard-state')).toHaveTextContent('off');
  });

  test('telemetry and diagnostics toggles reflect settings state', () => {
    render(
      <Wrapper>
        <PrivacyDashboard />
        <SettingsObserver />
      </Wrapper>,
    );

    const telemetrySwitch = screen.getByRole('switch', { name: /Toggle telemetry collection/i });
    const diagnosticsSwitch = screen.getByRole('switch', { name: /Toggle diagnostics collection/i });

    expect(screen.getByTestId('telemetry-state')).toHaveTextContent('off');
    expect(screen.getByTestId('diagnostics-state')).toHaveTextContent('on');

    fireEvent.click(telemetrySwitch);
    fireEvent.click(diagnosticsSwitch);

    expect(screen.getByTestId('telemetry-state')).toHaveTextContent('on');
    expect(screen.getByTestId('diagnostics-state')).toHaveTextContent('off');
  });
});
