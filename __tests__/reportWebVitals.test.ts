import {
  ANALYTICS_CONSENT,
  __resetAnalyticsStateForTests,
  setAnalyticsConsent,
  trackEvent,
} from '../lib/analytics';
import { reportWebVitals } from '../utils/reportWebVitals';

jest.mock('../lib/analytics', () => {
  const actual = jest.requireActual('../lib/analytics');
  return {
    ...actual,
    trackEvent: jest.fn(),
  };
});

describe('reportWebVitals', () => {
  const mockTrackEvent = trackEvent as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;

  beforeEach(() => {
    mockTrackEvent.mockReset();
    warnSpy.mockClear();
    window.localStorage.clear();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' };
    setAnalyticsConsent(ANALYTICS_CONSENT.GRANTED);
    __resetAnalyticsStateForTests();
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('alerts when INP exceeds threshold', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '3', name: 'INP', value: 300 });
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'INP degraded' })
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
