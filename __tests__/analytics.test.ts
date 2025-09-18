import ReactGA from 'react-ga4';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  recordStudyClick,
  flushStudyMetrics,
  __STUDY_TEST_ONLY,
} from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    __STUDY_TEST_ONLY.reset();
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

  it('tracks study click depth and dwell time', () => {
    const before = Date.now();
    recordStudyClick();
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'study', action: 'click' })
    );
    mockEvent.mockClear();
    flushStudyMetrics();
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'study', action: 'session_summary' })
    );
    const { clickDepth } = __STUDY_TEST_ONLY.getMetrics();
    expect(clickDepth).toBe(0);
    expect(mockEvent.mock.calls[0][0].label).toContain('"clickDepth":1');
    const dwellPayload = mockEvent.mock.calls[0][0].label;
    const dwell = JSON.parse(dwellPayload).dwellMs;
    expect(dwell).toBeGreaterThanOrEqual(0);
    expect(Date.now()).toBeGreaterThanOrEqual(before);
  });
});

