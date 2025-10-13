import ReactGA from 'react-ga4';
import {
  __resetExperimentExposureCache,
  logEvent,
  logExperimentExposure,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    __resetExperimentExposureCache();
    sessionStorage.clear();
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

  it('logs experiment exposure only once per session', () => {
    logExperimentExposure('launcher-density', 'compact');
    logExperimentExposure('launcher-density', 'compact');

    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'experiment:launcher-density',
      action: 'exposure',
      label: 'compact',
      nonInteraction: true,
    });
  });

  it('persists experiment exposure dedupe in session storage', () => {
    logExperimentExposure('window-chrome', 'contrast');

    expect(JSON.parse(sessionStorage.getItem('experiments:exposures') ?? '[]')).toContain('window-chrome');

    mockEvent.mockClear();
    logExperimentExposure('window-chrome', 'contrast');
    expect(mockEvent).not.toHaveBeenCalled();
  });
});

