import ReactGA from 'react-ga4';
import { reportWebVitals } from '../utils/reportWebVitals';
import {
  getWebVitalsClientId,
  resetWebVitalsConfig,
  updateWebVitalsConfig,
} from '../utils/webVitalsConfig';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('reportWebVitals', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;
  const originalRandom = Math.random;

  const setSampleConfig = (config: Parameters<typeof updateWebVitalsConfig>[0]) => {
    updateWebVitalsConfig({
      defaultSampleRate: 1,
      sampleRates: { LCP: 1, INP: 1 },
      allowRoutes: [],
      allowClients: [],
    });
    updateWebVitalsConfig(config);
  };

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    process.env = { ...originalEnv };
    Math.random = originalRandom;
    resetWebVitalsConfig();
    setSampleConfig({});
    window.history.replaceState(null, '', '/');
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
    Math.random = originalRandom;
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
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
  });

  it('skips events when sampling rate blocks them', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    setSampleConfig({ defaultSampleRate: 0, sampleRates: { LCP: 0 } });
    reportWebVitals({ id: '4', name: 'LCP', value: 2100 });
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('samples when the current route is allowlisted', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    setSampleConfig({ defaultSampleRate: 0, allowRoutes: ['/focused/*'] });
    window.history.pushState(null, '', '/focused/test');
    reportWebVitals({ id: '5', name: 'LCP', value: 2100 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
  });

  it('samples when the client is allowlisted', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    const clientId = getWebVitalsClientId();
    setSampleConfig({ defaultSampleRate: 0, allowClients: [clientId] });
    reportWebVitals({ id: '6', name: 'INP', value: 210 });
    expect(mockEvent).toHaveBeenCalledTimes(2);
  });

  it('applies sampling changes immediately', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    setSampleConfig({ defaultSampleRate: 0, sampleRates: { LCP: 0 } });
    reportWebVitals({ id: '7', name: 'LCP', value: 1900 });
    expect(mockEvent).not.toHaveBeenCalled();

    setSampleConfig({ defaultSampleRate: 1, sampleRates: { LCP: 1 } });
    reportWebVitals({ id: '8', name: 'LCP', value: 1900 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
  });
});
