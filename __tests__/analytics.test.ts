import { logEvent, logGameStart, logGameEnd, logGameError } from '../utils/analytics';
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

describe('analytics utilities', () => {
  const mockEvent = (ReactGA as { event: jest.Mock }).event;
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    resetAnalyticsClientForTesting();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_TRACKING_ID: 'test',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs generic events', async () => {
    const event = { category: 'test', action: 'act' } as any;
    logEvent(event);
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('logs game start', async () => {
    logGameStart('chess');
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'start' });
  });

  it('logs game end with label', async () => {
    logGameEnd('chess', 'win');
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'end', label: 'win' });
  });

  it('logs game error with message', async () => {
    logGameError('chess', 'oops');
    await flushPromises();
    expect(mockEvent).toHaveBeenCalledWith({ category: 'chess', action: 'error', label: 'oops' });
  });

  it('handles errors from ReactGA.event without throwing', async () => {
    mockEvent.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
    await flushPromises();
  });
});
