import ReactGA from 'react-ga4';
import { reportWebVitals, setWebVitalsNotificationClient } from '../utils/reportWebVitals';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('reportWebVitals', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const pushNotification = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    pushNotification.mockReset();
    process.env = { ...originalEnv };
    setWebVitalsNotificationClient({ pushNotification });
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
  });

  afterEach(() => {
    setWebVitalsNotificationClient(null);
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(mockEvent).not.toHaveBeenCalled();
    expect(pushNotification).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(pushNotification).not.toHaveBeenCalled();
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
    expect(pushNotification).toHaveBeenCalledTimes(1);
    expect(pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'system-monitor',
        title: expect.stringContaining('INP'),
        body: expect.stringContaining('300'),
        priority: 'high',
      })
    );
    expect(pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        hints: expect.objectContaining({ metric: 'INP', metricValue: 300 })
      })
    );
  });
});
