import ReactGA from 'react-ga4';
import { reportWebVitals } from '../utils/reportWebVitals';
import { __resetAnalyticsStateForTests } from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  initialize: jest.fn(),
}));

describe('reportWebVitals', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    (ReactGA.initialize as jest.Mock).mockReset();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VERCEL_ENV: 'preview',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_TRACKING_ID: 'G-TEST',
    };
    __resetAnalyticsStateForTests();
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(mockEvent).not.toHaveBeenCalled();
  });

  const flushPromises = (): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0);
    });

  it('records LCP metric in preview', async () => {
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('alerts when INP exceeds threshold', async () => {
    reportWebVitals({ id: '3', name: 'INP', value: 300 });
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledTimes(2);
    expect(mockEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'INP degraded' })
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
