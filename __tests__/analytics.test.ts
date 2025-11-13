import ReactGA from 'react-ga4';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  scheduleAnalyticsInitialization,
  __resetAnalyticsStateForTests,
} from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  initialize: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const mockInitialize = ReactGA.initialize as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    mockEvent.mockReset();
    mockInitialize.mockReset();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_TRACKING_ID: 'G-TEST',
    };
    __resetAnalyticsStateForTests();
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;
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
    mockEvent.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
  });

  it('does not log events when analytics disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false';
    __resetAnalyticsStateForTests();
    logGameStart('chess');
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('schedules initialization with requestIdleCallback when available', async () => {
    const callbacks: Array<() => void> = [];
    (window as any).requestIdleCallback = jest.fn((cb: () => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    (window as any).cancelIdleCallback = jest.fn();

    const cancel = scheduleAnalyticsInitialization();
    expect(typeof cancel).toBe('function');
    expect((window as any).requestIdleCallback).toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();

    callbacks.forEach((cb) => cb());
    await Promise.resolve();

    expect(mockInitialize).toHaveBeenCalledWith('G-TEST');
    cancel?.();
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    const timeoutSpy = jest.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const cancel = scheduleAnalyticsInitialization();
    expect(timeoutSpy).toHaveBeenCalled();
    cancel?.();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    timeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});

