import ReactGA from 'react-ga4';
import {
  ANALYTICS_CONSENT,
  __resetAnalyticsStateForTests,
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  setAnalyticsConsent,
  trackEvent,
} from '../lib/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  initialize: jest.fn(),
  send: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    window.localStorage.clear();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' };
    setAnalyticsConsent(ANALYTICS_CONSENT.GRANTED);
    __resetAnalyticsStateForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs generic events', () => {
    const event = { category: 'test', action: 'act' } as any;
    logEvent(event);
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('logs game start', () => {
    logGameStart('chess');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'start' });
  });

  it('logs game end with label', () => {
    logGameEnd('chess', 'win');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'end', label: 'win' });
  });

  it('logs game error with message', () => {
    logGameError('chess', 'oops');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'error', label: 'oops' });
  });

  it('handles errors from ReactGA.event without throwing', () => {
    mockEvent.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
  });

  it('does not emit events when analytics is disabled via flag', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false';
    trackEvent({ category: 'test', action: 'act' } as any);
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('does not emit events when consent is denied', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    setAnalyticsConsent(ANALYTICS_CONSENT.DENIED);
    trackEvent({ category: 'test', action: 'act' } as any);
    expect(mockEvent).not.toHaveBeenCalled();
  });
});

