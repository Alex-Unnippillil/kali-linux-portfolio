import { buildErrorContext, createBugReportPayload } from '../lib/bugReport';
import { getTelemetryWindowMs, TelemetryEntry } from '../lib/telemetry';

describe('createBugReportPayload', () => {
  it('includes diagnostics and filters logs to the telemetry window', () => {
    const telemetryWindowMs = getTelemetryWindowMs();
    const now = Date.now();
    const logs: TelemetryEntry[] = [
      {
        timestamp: now - telemetryWindowMs + 1000,
        level: 'info',
        message: 'recent message',
      },
      {
        timestamp: now - telemetryWindowMs - 2000,
        level: 'error',
        message: 'stale message',
      },
    ];

    const payload = createBugReportPayload({
      description: 'Example bug',
      route: '/apps/demo',
      userAgent: 'JestAgent/1.0',
      diagnostics: { language: 'en-US', platform: 'test' },
      logs,
      telemetryWindowMs,
      now,
    });

    expect(payload.description).toBe('Example bug');
    expect(payload.route).toBe('/apps/demo');
    expect(payload.userAgent).toBe('JestAgent/1.0');
    expect(payload.diagnostics).toMatchObject({ language: 'en-US', platform: 'test' });
    expect(payload.telemetryWindowMs).toBe(telemetryWindowMs);
    expect(payload.logs).toHaveLength(1);
    expect(payload.logs[0].message).toBe('recent message');
    expect(new Date(payload.createdAt).getTime()).toBe(now);
  });
});

describe('buildErrorContext', () => {
  it('serializes error information and notes', () => {
    const error = new Error('boom');
    const context = buildErrorContext({
      error,
      errorInfo: { componentStack: 'Component > Child' } as any,
      source: 'test',
      note: 'Opened from test',
    });

    expect(context?.source).toBe('test');
    expect(context?.note).toBe('Opened from test');
    expect(context?.error?.message).toBe('boom');
    expect(context?.errorInfo?.componentStack).toContain('Component');
  });

  it('returns undefined when no data is provided', () => {
    expect(buildErrorContext({})).toBeUndefined();
  });
});
