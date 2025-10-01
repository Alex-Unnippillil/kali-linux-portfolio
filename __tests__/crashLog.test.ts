import type { ErrorInfo } from 'react';
import { exportCrashLogs, getCrashLogs, logCrash } from '../utils/crashLog';

const STORAGE_KEY = 'crash-logs';

describe('crashLog utilities', () => {
  const originalWarn = console.warn;

  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    console.warn = originalWarn;
    jest.restoreAllMocks();
  });

  it('handles corrupt entries gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    expect(getCrashLogs()).toEqual([]);

    const validEntry = {
      id: 'abc',
      timestamp: '2023-01-01T00:00:00.000Z',
      route: '/apps/test',
      message: 'Boom',
      stateHash: 'hash'
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([validEntry, { junk: true }]));

    expect(getCrashLogs()).toEqual([validEntry]);
  });

  it('includes metadata when exporting crash logs', () => {
    logCrash({
      error: new Error('Boom'),
      info: { componentStack: 'Component stack' } as ErrorInfo,
      route: '/apps/test',
      appId: 'terminal'
    });

    const exported = exportCrashLogs();
    const parsed = JSON.parse(exported);

    expect(parsed.meta).toEqual({
      schemaVersion: expect.any(Number),
      exportedAt: expect.any(String),
      entryCount: 1
    });

    expect(Array.isArray(parsed.entries)).toBe(true);
    expect(parsed.entries[0]).toEqual(
      expect.objectContaining({
        route: '/apps/test',
        appId: 'terminal',
        message: 'Boom',
        stateHash: expect.any(String)
      })
    );
  });
});

