import ReactGA from 'react-ga4';
import {
  isDoNotTrackEnabled,
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  setAnalyticsClient,
} from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    setAnalyticsClient(ReactGA as unknown as typeof import('react-ga4')['default']);
  });

  afterEach(() => {
    setAnalyticsClient(null);
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

  it('is a no-op when analytics client is not set', () => {
    setAnalyticsClient(null);
    logEvent({ category: 'noop', action: 'skip' } as any);
    expect(mockEvent).not.toHaveBeenCalled();
  });
});

describe('isDoNotTrackEnabled', () => {
  const originalNavigatorDnt = Object.getOwnPropertyDescriptor(navigator, 'doNotTrack');
  const originalMsNavigatorDnt = Object.getOwnPropertyDescriptor(navigator as Navigator & { msDoNotTrack?: string }, 'msDoNotTrack');
  const originalWindowDnt = Object.getOwnPropertyDescriptor(window as typeof window & { doNotTrack?: string }, 'doNotTrack');

  afterEach(() => {
    if (originalNavigatorDnt) {
      Object.defineProperty(navigator, 'doNotTrack', originalNavigatorDnt);
    } else {
      delete (navigator as Navigator & { doNotTrack?: string }).doNotTrack;
    }

    if (originalMsNavigatorDnt) {
      Object.defineProperty(navigator, 'msDoNotTrack', originalMsNavigatorDnt);
    } else {
      delete (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    }

    if (originalWindowDnt) {
      Object.defineProperty(window, 'doNotTrack', originalWindowDnt);
    } else {
      delete (window as typeof window & { doNotTrack?: string }).doNotTrack;
    }
  });

  it('returns false when no DNT flags exist', () => {
    expect(isDoNotTrackEnabled()).toBe(false);
  });

  it('returns true when navigator.doNotTrack is 1', () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      get: () => '1',
    });

    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it('returns true when window.doNotTrack is set to yes', () => {
    Object.defineProperty(window, 'doNotTrack', {
      configurable: true,
      value: 'yes',
      writable: true,
    });

    expect(isDoNotTrackEnabled()).toBe(true);
  });
});

