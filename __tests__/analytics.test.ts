import ReactGA from 'react-ga4';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  logPackageInstallAborted,
  logPackageInstallCompleted,
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

  it('logs package install completion metrics', () => {
    logPackageInstallCompleted('pkg-alpha', 123.6);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'package_manager',
      action: 'install_complete',
      label: 'pkg-alpha',
      value: 124,
    });
  });

  it('logs aborted package installs with optional duration', () => {
    logPackageInstallAborted('pkg-beta', 'network', 42.2);
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'package_manager',
      action: 'install_aborted',
      label: 'pkg-beta:network',
      value: 42,
    });

    mockEvent.mockClear();

    logPackageInstallAborted('pkg-gamma', 'user_cancelled');
    expect(mockEvent).toHaveBeenCalledWith({
      category: 'package_manager',
      action: 'install_aborted',
      label: 'pkg-gamma:user_cancelled',
    });
  });
});

