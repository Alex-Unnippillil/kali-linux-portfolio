import { reportWebVitals } from '../utils/reportWebVitals';
import ReactGA from 'react-ga4';
import { resetAnalyticsClientForTesting } from '../utils/analyticsClient';

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: jest.fn(),
    initialize: jest.fn(),
    send: jest.fn(),
  },
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('reportWebVitals', () => {
  const mockEvent = (ReactGA as { event: jest.Mock }).event;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    resetAnalyticsClientForTesting();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_TRACKING_ID: 'test',
    };
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
  });

  it('does nothing outside preview', async () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    await flushPromises();
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', async () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('alerts when INP exceeds threshold', async () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
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
