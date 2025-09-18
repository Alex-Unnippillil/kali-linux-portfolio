import { jest } from '@jest/globals';
import {
  __resetUpdateCenter,
  getUpdateMetrics,
  installUpdatePipeline,
  runUpdateJob,
  subscribeToUpdateMetrics,
} from '../modules/updateCenter';
import { logUpdateEvent } from '../utils/analytics';

jest.mock('../utils/analytics', () => ({
  logEvent: jest.fn(),
  logGameStart: jest.fn(),
  logGameEnd: jest.fn(),
  logGameError: jest.fn(),
  logUpdateEvent: jest.fn(),
}));

describe('update center pipeline', () => {
  beforeEach(() => {
    __resetUpdateCenter();
    (logUpdateEvent as jest.Mock).mockClear();
  });

  afterEach(() => {
    __resetUpdateCenter();
  });

  it('records successful runs and emits analytics events', async () => {
    installUpdatePipeline({
      id: 'success-job',
      label: 'success-job',
      schedule: '*/5 * * * * *',
      execute: async () => ({
        modules: undefined,
        version: '1.0.1',
        updateAvailable: false,
        message: 'ok',
      }),
    });

    const attempts: number[] = [];
    const unsubscribe = subscribeToUpdateMetrics((metrics) => {
      attempts.push(metrics.attempts);
    });

    await runUpdateJob('success-job');
    unsubscribe();

    expect((logUpdateEvent as jest.Mock).mock.calls[0]).toEqual([
      'update_start',
      'success-job',
      1,
    ]);
    expect((logUpdateEvent as jest.Mock).mock.calls[1][0]).toBe('update_success');

    const metrics = getUpdateMetrics();
    expect(metrics.attempts).toBe(1);
    expect(metrics.successes).toBe(1);
    expect(metrics.successRate).toBe(1);
    expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    expect(attempts.at(-1)).toBe(1);
  });

  it('redacts package names when logging failures', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    installUpdatePipeline({
      id: 'failure-job',
      label: 'failure-job',
      schedule: '*/5 * * * * *',
      packagesToRedact: ['secret-package'],
      execute: async () => {
        throw new Error('Failed to update secret-package to 1.0.0');
      },
    });

    await runUpdateJob('failure-job');
    consoleSpy.mockRestore();

    const calls = (logUpdateEvent as jest.Mock).mock.calls;
    expect(calls[0]).toEqual(['update_start', 'failure-job', 1]);
    expect(calls[1]).toEqual(['update_retry', 'failure-job', 1]);

    const metrics = getUpdateMetrics();
    expect(metrics.attempts).toBe(1);
    expect(metrics.successes).toBe(0);
    expect(metrics.lastError).toBeDefined();
    expect(metrics.lastError).not.toContain('secret-package');
  });
});
