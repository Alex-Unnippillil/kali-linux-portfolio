import ReactGA from 'react-ga4';
import {
  getAnalyticsBufferStats,
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
  flushAnalyticsEvents,
} from '../utils/analytics';
import {
  resetTelemetryPreferences,
  setTelemetryPreference,
} from '../modules/telemetry/preferences';
import { resetTelemetryBuffer } from '../modules/telemetry/buffer';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

describe('analytics utilities', () => {
  const mockEvent = ReactGA.event as jest.Mock;

  beforeEach(() => {
    mockEvent.mockReset();
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    window.localStorage.clear();
    resetTelemetryBuffer();
    resetTelemetryPreferences();
  });

  it('does not enqueue events when analytics is disabled by default', () => {
    const event = { category: 'test', action: 'act' } as any;
    const result = logEvent(event);
    expect(result).toBe(false);
    expect(getAnalyticsBufferStats().totalEvents).toBe(0);
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('logs game start', () => {
    setTelemetryPreference('analytics', true);
    logGameStart('chess');
    const stats = getAnalyticsBufferStats();
    expect(stats.totalEvents).toBe(1);
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('logs game end with label', () => {
    setTelemetryPreference('analytics', true);
    logGameEnd('chess', 'win');
    const stats = getAnalyticsBufferStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.totalBytes).toBeGreaterThan(0);
  });

  it('logs game error with message', () => {
    setTelemetryPreference('analytics', true);
    logGameError('chess', 'oops');
    expect(getAnalyticsBufferStats().totalEvents).toBe(1);
  });

  it('handles errors from ReactGA.event without throwing', () => {
    mockEvent.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    setTelemetryPreference('analytics', true);
    logEvent({ category: 't', action: 'a' } as any);
    expect(() => flushAnalyticsEvents()).not.toThrow();
  });

  it('flushes analytics events and clears the buffer', () => {
    setTelemetryPreference('analytics', true);
    logEvent({ category: 'test', action: 'act' } as any);
    expect(getAnalyticsBufferStats().totalEvents).toBe(1);
    const sent = flushAnalyticsEvents();
    expect(sent).toBe(1);
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(getAnalyticsBufferStats().totalEvents).toBe(0);
  });

  it('purges telemetry buffer without dispatching', () => {
    setTelemetryPreference('analytics', true);
    logEvent({ category: 'test', action: 'act' } as any);
    resetTelemetryBuffer();
    expect(mockEvent).not.toHaveBeenCalled();
    expect(getAnalyticsBufferStats().totalEvents).toBe(0);
  });
});

