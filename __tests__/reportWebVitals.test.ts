import ReactGA from 'react-ga4';
import { reportWebVitals } from '../utils/reportWebVitals';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('reportWebVitals', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    warnSpy.mockClear();
    process.env = { ...originalEnv };
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

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LCP' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  describe.each([
    { metric: 'LCP', threshold: 2500 },
    { metric: 'INP', threshold: 200 },
  ])('$metric boundaries', ({ metric, threshold }) => {
    it('logs metric payload below the threshold with rounded value', () => {
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
      const value = threshold - 0.49;
      reportWebVitals({ id: `${metric}-below`, name: metric, value });
      expect(mockEvent).toHaveBeenCalledTimes(1);
      expect(mockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: metric,
          value: Math.round(value),
        })
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs metric payload equal to the threshold without triggering alerts', () => {
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
      reportWebVitals({ id: `${metric}-equal`, name: metric, value: threshold });
      expect(mockEvent).toHaveBeenCalledTimes(1);
      expect(mockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: metric,
          value: Math.round(threshold),
        })
      );
      expect(mockEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: `${metric} degraded` })
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('emits an alert when above the threshold', () => {
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
      const value = threshold + 0.6;
      const rounded = Math.round(value);
      reportWebVitals({ id: `${metric}-above`, name: metric, value });
      expect(mockEvent).toHaveBeenCalledTimes(2);
      expect(mockEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          action: metric,
          value: rounded,
        })
      );
      expect(mockEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          action: `${metric} degraded`,
          value: rounded,
        })
      );
      expect(warnSpy).toHaveBeenCalledWith(`Web Vitals alert: ${metric} ${rounded}`);
    });
  });
});
