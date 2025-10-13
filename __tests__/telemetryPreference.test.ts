import { applyTelemetryPreference, __resetTelemetryForTests } from '../services/telemetry';

const replayMockInstances: Array<{ options: Record<string, unknown>; stop: jest.Mock }> = [];

jest.mock('@sentry/nextjs', () => {
  return {
    init: jest.fn(),
    browserTracingIntegration: jest.fn((options) => ({ name: 'browserTracing', options })),
  };
});

jest.mock('@sentry/core', () => ({
  getCurrentHub: jest.fn(),
}));

jest.mock('@sentry/replay', () => {
  return {
    Replay: jest.fn().mockImplementation((options) => {
      const instance = {
        options,
        stop: jest.fn(),
      };
      replayMockInstances.push(instance);
      return instance;
    }),
  };
});

const sentry = jest.mocked(
  require('@sentry/nextjs') as typeof import('@sentry/nextjs'),
);
const core = jest.mocked(
  require('@sentry/core') as typeof import('@sentry/core'),
);

describe('applyTelemetryPreference', () => {
  let closeMock: jest.Mock;

  beforeEach(() => {
    replayMockInstances.length = 0;
    jest.clearAllMocks();
    __resetTelemetryForTests();
    closeMock = jest.fn().mockResolvedValue(undefined);
    const getClient = jest.fn(() => ({ close: closeMock }));
    core.getCurrentHub.mockReturnValue({ getClient });
  });

  it('does not initialize telemetry without a DSN', async () => {
    await applyTelemetryPreference(true, { environment: 'test' });

    expect(sentry.init).not.toHaveBeenCalled();
    expect(replayMockInstances).toHaveLength(0);
  });

  it('initializes replay and performance monitoring when enabled', async () => {
    await applyTelemetryPreference(true, {
      dsn: 'test-dsn',
      environment: 'preview',
      tracesSampleRate: '0.5',
      replaysSessionSampleRate: '0.1',
      replaysOnErrorSampleRate: '0.2',
      tracePropagationTargets: 'localhost,/https:\\/.+example\\.com/',
    });

    expect(sentry.browserTracingIntegration).toHaveBeenCalledWith({
      tracePropagationTargets: ['localhost', /https:\/.+example\.com/],
    });
    expect(sentry.init).toHaveBeenCalledTimes(1);
    const initConfig = sentry.init.mock.calls[0][0];
    expect(initConfig.dsn).toBe('test-dsn');
    expect(initConfig.environment).toBe('preview');
    expect(initConfig.tracesSampleRate).toBe(0.5);
    expect(initConfig.replaysSessionSampleRate).toBe(0.1);
    expect(initConfig.replaysOnErrorSampleRate).toBe(0.2);
    expect(replayMockInstances).toHaveLength(1);
    expect(replayMockInstances[0].options).toMatchObject({
      maskAllInputs: true,
      blockAllMedia: true,
    });
  });

  it('is idempotent when enabling multiple times', async () => {
    await applyTelemetryPreference(true, { dsn: 'test-dsn' });
    await applyTelemetryPreference(true, { dsn: 'test-dsn' });

    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(replayMockInstances).toHaveLength(1);
  });

  it('shuts down telemetry when disabled after enabling', async () => {
    await applyTelemetryPreference(true, { dsn: 'test-dsn' });
    await applyTelemetryPreference(false, { dsn: 'test-dsn' });

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(replayMockInstances[0].stop).toHaveBeenCalledTimes(1);
  });

  it('re-initializes after being disabled', async () => {
    await applyTelemetryPreference(true, { dsn: 'test-dsn' });
    await applyTelemetryPreference(false, { dsn: 'test-dsn' });
    await applyTelemetryPreference(true, { dsn: 'test-dsn' });

    expect(sentry.init).toHaveBeenCalledTimes(2);
    expect(replayMockInstances).toHaveLength(2);
  });
});
