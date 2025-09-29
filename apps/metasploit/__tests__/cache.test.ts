import type { Module } from '../types';

const sampleModules: Module[] = [
  {
    name: 'auxiliary/test/sample',
    description: 'Sample module',
    type: 'auxiliary',
    severity: 'low',
    platform: 'linux',
    tags: ['sample'],
  },
  {
    name: 'exploit/test/sample',
    description: 'Exploit example',
    type: 'exploit',
    severity: 'high',
    platform: 'windows',
    tags: ['windows'],
  },
];

describe('module cache', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('hydrates the cache after the first load and reuses it', async () => {
    const { calculateRevision, ensureModuleCache, readModuleCache, clearModuleCache } = await import(
      '../cache'
    );

    await clearModuleCache();

    const revision = calculateRevision(sampleModules);
    const firstLoad = await ensureModuleCache(sampleModules, revision);
    expect(firstLoad.source).toBe('seed');
    expect(firstLoad.modules).toHaveLength(sampleModules.length);

    const payload = await readModuleCache();
    expect(payload).not.toBeNull();
    expect(payload?.modules).toHaveLength(sampleModules.length);
    expect(payload?.revision).toBe(revision);

    const secondLoad = await ensureModuleCache(sampleModules, revision);
    expect(secondLoad.source).toBe('cache');
    expect(secondLoad.modules).toHaveLength(sampleModules.length);
  });
});
