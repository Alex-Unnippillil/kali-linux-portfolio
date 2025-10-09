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

  it('allows opting into production via configuration', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_WEB_VITALS_ENVS = 'production,preview';

    reportWebVitals({ id: '4', name: 'INP', value: 150 });

    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INP', label: '4' })
    );
  });

  it('respects metric opt-in configuration', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    process.env.NEXT_PUBLIC_WEB_VITALS_METRICS = 'CLS';

    reportWebVitals({ id: '5', name: 'LCP', value: 2100 });
    expect(mockEvent).not.toHaveBeenCalled();

    reportWebVitals({ id: '6', name: 'CLS', value: 0.2 });

    expect(mockEvent).toHaveBeenCalledTimes(2);
    expect(mockEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'CLS', label: '6' })
    );
    expect(mockEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'CLS degraded' })
    );
  });
});
