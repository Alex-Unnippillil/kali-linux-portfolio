import ReactGA from 'react-ga4';
import { track } from '@vercel/analytics';
import { reportWebVitals } from '../utils/reportWebVitals';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

describe('reportWebVitals', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockTrack = track as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    logSpy.mockClear();
    mockTrack.mockReset();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    window.localStorage.setItem('analytics-enabled', 'true');
  });

  afterAll(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    process.env = originalEnv;
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(mockEvent).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('alerts when INP exceeds threshold', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '3', name: 'INP', value: 300 });
    expect(mockEvent).toHaveBeenCalledTimes(2);
    expect(mockEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'INP degraded' })
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('web-vitals-alert', {
      name: 'INP',
      id: '3',
      value: 300,
    });
  });

  it('records TTI metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '4', name: 'TTI', value: 4000 });
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TTI' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('alerts when TTI exceeds threshold', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '5', name: 'TTI', value: 6000 });
    expect(mockEvent).toHaveBeenCalledTimes(2);
    expect(mockEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'TTI degraded' })
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('web-vitals-alert', {
      name: 'TTI',
      id: '5',
      value: 6000,
    });
  });

  it('logs TTFB and CLS metrics', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '6', name: 'TTFB', value: 100 });
    reportWebVitals({ id: '7', name: 'CLS', value: 0.2 });
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
