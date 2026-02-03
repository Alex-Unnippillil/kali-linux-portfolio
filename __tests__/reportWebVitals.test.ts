import { reportWebVitals } from '../utils/reportWebVitals';

describe('reportWebVitals', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const originalEnv = process.env;
  let gtagMock: jest.Mock;

  beforeEach(() => {
    gtagMock = jest.fn();
    window.gtag = gtagMock;
    warnSpy.mockClear();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' };
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env = originalEnv;
    delete window.gtag;
  });

  it('does nothing outside preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    reportWebVitals({ id: '1', name: 'LCP', value: 3000 });
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it('records LCP metric in preview', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '2', name: 'LCP', value: 2000 });
    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'LCP',
      expect.objectContaining({ event_category: 'Web Vitals' })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('alerts when INP exceeds threshold', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    reportWebVitals({ id: '3', name: 'INP', value: 300 });
    expect(gtagMock).toHaveBeenCalledTimes(2);
    expect(gtagMock).toHaveBeenNthCalledWith(
      2,
      'event',
      'INP degraded',
      expect.objectContaining({ event_category: 'Performance Alert' })
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
