import {
  LOG_BUFFER_LIMIT,
  clearAppLogBuffer,
  createLogger,
  formatLogsForExport,
  getAppLogBuffer,
} from '../lib/logger';

describe('logger buffers', () => {
  const appId = 'test-app';

  beforeEach(() => {
    clearAppLogBuffer(appId);
  });

  afterEach(() => {
    clearAppLogBuffer(appId);
  });

  it('enforces per-app buffer limits', () => {
    const logger = createLogger({ appId, correlationId: 'limit-test' });
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      for (let i = 0; i < LOG_BUFFER_LIMIT + 5; i += 1) {
        logger.info(`event-${i}`);
      }
    } finally {
      spy.mockRestore();
    }

    const logs = getAppLogBuffer(appId);
    expect(logs).toHaveLength(LOG_BUFFER_LIMIT);
    expect(logs[0].message).toBe('event-5');
    expect(logs[logs.length - 1].message).toBe(`event-${LOG_BUFFER_LIMIT + 4}`);
    expect(logs.every((entry) => entry.appId === appId)).toBe(true);
  });

  it('serializes logs for export without sensitive metadata', () => {
    const logger = createLogger({ appId, correlationId: 'export-test' });
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logger.warn('user action', { user: 'alice', password: 'super-secret' });
    } finally {
      spy.mockRestore();
    }

    const raw = formatLogsForExport(appId);
    const parsed = JSON.parse(raw);

    expect(parsed.appId).toBe(appId);
    expect(parsed.count).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.logs).toHaveLength(1);

    const [entry] = parsed.logs;
    expect(entry).toMatchObject({
      appId,
      level: 'warn',
      message: 'user action',
      correlationId: 'export-test',
    });
    expect(typeof entry.timestamp).toBe('string');
    expect(entry.meta).toEqual({ user: 'alice' });
  });
});
