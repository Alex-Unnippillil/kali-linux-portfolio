import type { Module } from '../types';

const sampleModules: Module[] = [
  {
    name: 'auxiliary/test/offline',
    description: 'Offline path',
    type: 'auxiliary',
    severity: 'low',
  },
];

describe('module cache offline fallback', () => {
  afterEach(() => {
    jest.dontMock('../../../utils/safeIDB');
    jest.resetModules();
  });

  it('falls back to seed data when IndexedDB is unavailable', async () => {
    jest.resetModules();
    jest.doMock('../../../utils/safeIDB', () => ({
      getDb: () => null,
    }));

    const { ensureModuleCache, calculateRevision } = await import('../cache');
    const revision = calculateRevision(sampleModules);
    const result = await ensureModuleCache(sampleModules, revision);

    expect(result.source).toBe('seed');
    expect(result.modules).toEqual(sampleModules);
  });
});
