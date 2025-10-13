import ReactGA from 'react-ga4';
import {
  CONTACT_FUNNEL_STEPS,
  logContactFunnelStep,
  logEvent,
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
  });

  it('logs generic events with sanitisation', () => {
    const event = {
      category: 'Test Category',
      action: 'Act',
      label: 'Contact me at email@example.com',
    } as any;
    logEvent(event);
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Test Category',
        action: 'Act',
        label: expect.stringContaining('[email]'),
      }),
    );
  });

  it('logs game start', () => {
    logGameStart('chess');
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'chess', action: 'start' }),
    );
  });

  it('logs game end with label', () => {
    logGameEnd('chess', 'win');
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'chess', action: 'end', label: 'win' }),
    );
  });

  it('logs game error with message', () => {
    logGameError('chess', 'oops');
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'chess', action: 'error', label: 'oops' }),
    );
  });

  it('handles errors from ReactGA.event without throwing', () => {
    mockEvent.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => logEvent({ category: 't', action: 'a' } as any)).not.toThrow();
  });

  it('logs contact funnel steps with session identifier', () => {
    window.sessionStorage.setItem('analytics:contact:sid', 'known');
    logContactFunnelStep('form_started', { surface: 'unit-test', reason: 'focus' });
    expect(mockEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'contact_funnel',
        action: 'form_started',
        label: expect.stringContaining('sid=known'),
      }),
    );
  });

  it('exposes funnel step ordering for reporting', () => {
    expect(CONTACT_FUNNEL_STEPS).toEqual([
      'view_contact_entry',
      'form_started',
      'submission_success',
    ]);
  });
});

