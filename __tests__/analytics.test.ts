import ReactGA from 'react-ga4';
import { logEvent, logGameStart, logGameEnd, logGameError, logPageView } from '../utils/analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  send: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;
  const mockSend = ReactGA.send as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    mockSend.mockReset();
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

  it('logs page views', () => {
    const payload = { hitType: 'pageview', page: '/desktop' } as any;
    logPageView(payload);
    expect(mockSend).toHaveBeenCalledWith(payload);
  });

  it('logs page views from shorthand parameters', () => {
    logPageView('/lock-screen', 'Lock Screen');
    expect(mockSend).toHaveBeenCalledWith({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
  });

  it('handles errors from ReactGA.send without throwing', () => {
    mockSend.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => logPageView({ hitType: 'pageview', page: '/error' } as any)).not.toThrow();
  });
});

