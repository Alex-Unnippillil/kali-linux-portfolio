import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { PRIVACY_PROFILES, getPrivacyProfileDefaults } from '../utils/settingsStore';
import { logEvent } from '../utils/analytics';
import { trackEvent } from '../lib/analytics-client';

jest.mock('react-ga4', () => {
  const event = jest.fn();
  const send = jest.fn();
  const initialize = jest.fn();
  return {
    event,
    send,
    initialize,
    __eventMock: event,
  };
});

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

describe('privacy settings', () => {
  let consoleLogSpy: jest.SpyInstance;
  const originalLocalStorage = window.localStorage;
  const createMemoryStorage = () => {
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
    } as Storage;
  };

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  it('persists analytics consent per profile', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.privacyProfile).toBe(PRIVACY_PROFILES[0].id));

    act(() => {
      result.current.setAnalyticsConsent(false);
      result.current.setTelemetryConsent(false);
    });

    expect(result.current.analyticsConsent).toBe(false);
    expect(result.current.telemetryConsent).toBe(false);
    const storedStandard = window.localStorage.getItem('privacy-consent:standard');
    expect(storedStandard && JSON.parse(storedStandard).analytics).toBe(false);
    expect(storedStandard && JSON.parse(storedStandard).telemetry).toBe(false);

    const secondaryProfile = PRIVACY_PROFILES[1];
    expect(secondaryProfile).toBeDefined();

    act(() => {
      result.current.setPrivacyProfile(secondaryProfile.id);
    });

    await waitFor(() => expect(result.current.privacyProfile).toBe(secondaryProfile.id));
    const defaults = getPrivacyProfileDefaults(secondaryProfile.id);
    expect(result.current.analyticsConsent).toBe(defaults.analytics);

    act(() => {
      result.current.setAnalyticsConsent(true);
    });
    expect(result.current.analyticsConsent).toBe(true);
    const storedSecondary = window.localStorage.getItem(
      `privacy-consent:${secondaryProfile.id}`,
    );
    expect(storedSecondary && JSON.parse(storedSecondary).analytics).toBe(true);

    act(() => {
      result.current.setPrivacyProfile(PRIVACY_PROFILES[0].id);
    });
    await waitFor(() => expect(result.current.analyticsConsent).toBe(false));
  });

  it('disables analytics events when consent revoked', async () => {
    const { __eventMock: eventMock } = jest.requireMock('react-ga4') as {
      __eventMock: jest.Mock;
    };
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.analyticsConsent).not.toBeUndefined());

    act(() => {
      result.current.setAnalyticsConsent(true);
    });

    eventMock.mockClear();
    logEvent({ category: 'test', action: 'enabled' } as any);
    expect(eventMock).toHaveBeenCalled();

    act(() => {
      result.current.setAnalyticsConsent(false);
    });
    await waitFor(() => expect(result.current.analyticsConsent).toBe(false));

    eventMock.mockClear();
    logEvent({ category: 'test', action: 'disabled' } as any);
    expect(eventMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setAnalyticsConsent(true);
    });
    await waitFor(() => expect(result.current.analyticsConsent).toBe(true));

    eventMock.mockClear();
    logEvent({ category: 'test', action: 're-enabled' } as any);
    expect(eventMock).toHaveBeenCalled();
  });

  it('stops telemetry events when telemetry consent is disabled', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    const { track: trackMock } = jest.requireMock('@vercel/analytics') as { track: jest.Mock };

    await waitFor(() => expect(result.current.telemetryConsent).not.toBeUndefined());

    act(() => {
      result.current.setTelemetryConsent(true);
    });
    await waitFor(() => expect(result.current.telemetryConsent).toBe(true));

    trackMock.mockClear();
    trackEvent('cta_click');
    expect(trackMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setTelemetryConsent(false);
    });
    await waitFor(() => expect(result.current.telemetryConsent).toBe(false));

    trackMock.mockClear();
    trackEvent('cta_click');
    expect(trackMock).not.toHaveBeenCalled();
  });
});
