jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

type AnalyticsModule = typeof import('../utils/analytics');

describe('analytics utilities', () => {
  let logEvent: AnalyticsModule['logEvent'];
  let logGameStart: AnalyticsModule['logGameStart'];
  let logGameEnd: AnalyticsModule['logGameEnd'];
  let logGameError: AnalyticsModule['logGameError'];
  let signalAnalyticsReady: AnalyticsModule['signalAnalyticsReady'];
  let mockEvent: jest.Mock;

  const importAnalytics = async () => {
    const analytics: AnalyticsModule = await import('../utils/analytics');
    logEvent = analytics.logEvent;
    logGameStart = analytics.logGameStart;
    logGameEnd = analytics.logGameEnd;
    logGameError = analytics.logGameError;
    signalAnalyticsReady = analytics.signalAnalyticsReady;
  };

  beforeEach(async () => {
    jest.resetModules();
    await importAnalytics();
    mockEvent = jest.requireMock('react-ga4').event as jest.Mock;
    mockEvent.mockReset();
  });

  it('logs generic events when ready', () => {
    const event = { category: 'test', action: 'act' } as any;
    signalAnalyticsReady();
    logEvent(event);
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('logs game start', () => {
    signalAnalyticsReady();
    logGameStart('chess');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'start' });
  });

  it('logs game end with label', () => {
    signalAnalyticsReady();
    logGameEnd('chess', 'win');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'end', label: 'win' });
  });

  it('logs game error with message', () => {
    signalAnalyticsReady();
    logGameError('chess', 'oops');
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'error', label: 'oops' });
  });

  it('queues events fired before readiness and flushes once ready', () => {
    const event = { category: 'queued', action: 'pending' } as any;
    logEvent(event);
    expect(mockEvent).not.toHaveBeenCalled();
    signalAnalyticsReady();
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('handles errors from ReactGA.event without throwing', () => {
    signalAnalyticsReady();
    mockEvent.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
  });
});

