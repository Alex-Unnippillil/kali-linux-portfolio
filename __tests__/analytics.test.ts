import ReactGA from 'react-ga4';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../utils/analytics';
import { clearAttributionSession, initAttributionSession } from '../utils/attribution';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    localStorage.clear();
    clearAttributionSession();
  });

  it('logs generic events', () => {
    const event = { category: 'test', action: 'act' } as any;
    logEvent(event);
    expect(mockEvent).toHaveBeenCalledWith(event);
  });

  it('includes attribution metadata when available', () => {
    const now = Date.now();
    initAttributionSession({
      location: {
        href: 'https://portfolio.test/?utm_source=github&utm_medium=profile',
        search: '?utm_source=github&utm_medium=profile',
        pathname: '/',
        hash: '',
      },
      referrer: 'https://ref.example',
      now,
      respectDNT: false,
    });

    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now + 10);
    logEvent({ category: 'test', action: 'act' } as any);

    expect(mockEvent).toHaveBeenCalledWith({
      category: 'test',
      action: 'act',
      attribution: {
        utm_source: 'github',
        utm_medium: 'profile',
        referrer: 'https://ref.example',
        landingPage: 'https://portfolio.test/?utm_source=github&utm_medium=profile',
      },
    });
    dateSpy.mockRestore();
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
});

