import { logEvent, logGameStart, logGameEnd, logGameError, __resetAnalyticsForTests, __setAnalyticsInstanceForTests } from '../utils/analytics';

jest.mock('react-ga4', () => ({
  default: {
    event: jest.fn(),
    send: jest.fn(),
  },
  event: jest.fn(),
  send: jest.fn(),
}));

const mockEvent = (jest.requireMock('react-ga4').default.event ||
  jest.requireMock('react-ga4').event) as jest.Mock;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('analytics utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    __resetAnalyticsForTests();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' };
    mockEvent.mockReset();
    (global as any).window = (global as any).window || {};
    __setAnalyticsInstanceForTests(jest.requireMock('react-ga4').default);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs generic events', async () => {
    const event = { category: 'test', action: 'act' } as any;
    logEvent(event);
    await flush();
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('logs game start', async () => {
    logGameStart('chess');
    await flush();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'start' });
  });

  it('logs game end with label', async () => {
    logGameEnd('chess', 'win');
    await flush();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'end', label: 'win' });
  });

  it('logs game error with message', async () => {
    logGameError('chess', 'oops');
    await flush();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'error', label: 'oops' });
  });

  it('handles errors from ReactGA.event without throwing', async () => {
    mockEvent.mockImplementationOnce(() => { throw new Error('fail'); });
    logEvent({ category: 't', action: 'a' } as any);
    await expect(flush()).resolves.toBeUndefined();
  });
});
