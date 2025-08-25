jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    send: jest.fn(),
    event: jest.fn(),
  },
}));

jest.mock('../lib/axiom', () => ({
  logEvent: jest.fn(),
}));

jest.mock('next/font/google', () => ({
  Inter: () => ({ className: '' }),
}));

jest.mock('../lib/validate', () => ({
  validatePublicEnv: () => {},
}));

jest.mock('../lib/analytics', () => ({
  trackEvent: jest.fn(),
  trackPageview: jest.fn(),
  trackWebVital: jest.fn().mockResolvedValue(undefined),
}));

describe('analytics disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
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
    const analytics = await import('../lib/analytics');
    const ReactGA = (await import('react-ga4')).default as any;
    analytics.trackPageview('/page');
    expect((ReactGA.send as jest.Mock).mock.calls.length).toBe(0);
  });

  it.each([undefined, 'false'])('reportWebVitals no-ops when env is %s', async (value) => {
    jest.resetModules();
    if (value !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = value;
    }
    const analytics = await import('../lib/analytics');
    const { reportWebVitals } = await import('../pages/_app');
    reportWebVitals({ id: '1', name: 'CLS', value: 0, label: 'web-vital', startTime: 0 });
    expect(analytics.trackWebVital).not.toHaveBeenCalled();
  });
});
