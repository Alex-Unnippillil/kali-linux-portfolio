import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-ga4', () => ({
  default: {
    send: vi.fn(),
    event: vi.fn(),
  },
}));

vi.mock('../lib/axiom', () => ({
  logEvent: vi.fn(),
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({ className: '' }),
}));

vi.mock('../lib/validate', () => ({
  validatePublicEnv: () => {},
}));

describe('analytics disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    localStorage.clear();
    localStorage.setItem('analytics-consent', 'granted');
  });

  it.each([undefined, 'false'])('trackEvent no-ops when env is %s', async (value) => {
    if (value !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = value;
    }
    const { trackEvent } = await import('../lib/analytics');
    const { logEvent } = await import('../lib/axiom');
    await trackEvent('test');
    expect(logEvent).not.toHaveBeenCalled();
  });

  it.each([undefined, 'false'])('trackPageview no-ops when env is %s', async (value) => {
    if (value !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = value;
    }
    const { trackPageview } = await import('../lib/analytics');
    const ReactGA = (await import('react-ga4')).default;
    trackPageview('/page');
    expect(ReactGA.send).not.toHaveBeenCalled();
  });

  it.each([undefined, 'false'])('reportWebVitals no-ops when env is %s', async (value) => {
    vi.resetModules();
    if (value !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = value;
    }
    const analytics = await import('../lib/analytics');
    const trackWebVitalSpy = vi.spyOn(analytics, 'trackWebVital').mockResolvedValue();
    const { reportWebVitals } = await import('../pages/_app');
    reportWebVitals({ id: '1', name: 'CLS', value: 0, label: 'web-vital', startTime: 0 });
    expect(trackWebVitalSpy).not.toHaveBeenCalled();
  });
});
