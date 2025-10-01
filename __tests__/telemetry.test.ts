import {
  __resetTelemetryStateForTests,
  buildSampleTelemetryPayload,
  enqueueTelemetry,
  flushTelemetryQueue,
  updateTelemetryConsent,
} from '../utils/telemetry';

describe('telemetry consent pipeline', () => {
  beforeEach(() => {
    __resetTelemetryStateForTests();
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('sends events only when consented', async () => {
    updateTelemetryConsent({ performance: false, errors: false, features: false });
    enqueueTelemetry('performance', { frameTime: 16, sessionId: 'abc123' });
    await flushTelemetryQueue();
    expect((global.fetch as jest.Mock)).not.toHaveBeenCalled();

    updateTelemetryConsent({ performance: true, errors: false, features: false });
    enqueueTelemetry('performance', { frameTime: 18, sessionId: 'def456' });
    await flushTelemetryQueue();

    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
    const body = JSON.parse(((global.fetch as jest.Mock).mock.calls[0][1]!.body as string) ?? '{}');
    expect(body.category).toBe('performance');
    expect(body.payload.sessionId).toBe('[redacted]');
  });

  it('clears queued events when consent is revoked', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    updateTelemetryConsent({ performance: true, errors: false, features: false });
    enqueueTelemetry('performance', { frameTime: 20, sessionId: 'ghi789' });
    await flushTelemetryQueue();

    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);

    updateTelemetryConsent({ performance: false, errors: false, features: false });
    (global.fetch as jest.Mock).mockClear().mockResolvedValue({ ok: true });
    await flushTelemetryQueue();

    expect((global.fetch as jest.Mock)).not.toHaveBeenCalled();
  });
});

describe('telemetry preview', () => {
  it('redacts sensitive fields in sample payloads', () => {
    const sample = buildSampleTelemetryPayload('errors');
    expect(sample.payload.sessionId).toBe('[redacted]');
    expect(sample.payload.userEmail).toBe('[redacted]');
    expect(JSON.stringify(sample)).not.toContain('operator@example.com');
  });
});
