import { logEvent, logGameStart, logGameEnd, logGameError } from '../utils/analytics';

describe('analytics utilities', () => {
  const originalEnv = process.env;
  let gtagMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' };
    gtagMock = jest.fn();
    window.gtag = gtagMock;
  });

  afterAll(() => {
    process.env = originalEnv;
    delete window.gtag;
  });

  it('logs generic events', () => {
    const event = { category: 'test', action: 'act' } as any;
    logEvent(event);
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'act',
      expect.objectContaining({ event_category: 'test' })
    );
  });

  it('logs game start', () => {
    logGameStart('chess');
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'start',
      expect.objectContaining({ event_category: 'chess' })
    );
  });

  it('logs game end with label', () => {
    logGameEnd('chess', 'win');
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'end',
      expect.objectContaining({ event_category: 'chess', event_label: 'win' })
    );
  });

  it('logs game error with message', () => {
    logGameError('chess', 'oops');
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'error',
      expect.objectContaining({ event_category: 'chess', event_label: 'oops' })
    );
  });

  it('handles errors from gtag without throwing', () => {
    gtagMock.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
  });
});
