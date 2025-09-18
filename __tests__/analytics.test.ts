import ReactGA from 'react-ga4';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  logStartupDelayChange,
  logStartupImpactSnapshot,
  logStartupToggle,
} from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
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

  it('logs startup toggle actions with rounded impact', () => {
    logStartupToggle('entry-1', true, 7.4);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'Startup Manager',
      action: 'enable-entry',
      label: 'entry-1',
      value: 7,
    });
    logStartupToggle('entry-2', false, -3);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'Startup Manager',
      action: 'disable-entry',
      label: 'entry-2',
      value: 0,
    });
  });

  it('logs startup delay changes with clamped seconds', () => {
    logStartupDelayChange('entry-3', 42.8);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'Startup Manager',
      action: 'set-delay',
      label: 'entry-3',
      value: 43,
    });
  });

  it('logs startup impact snapshots', () => {
    logStartupImpactSnapshot(18.2, 1);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'Startup Manager',
      action: 'impact-snapshot',
      label: 'heavy-disabled:1',
      value: 18,
    });
  });
});

