import {
  clearQuickSearchCache,
  filterQuickSearchIndex,
  getQuickSearchIndex,
  warmQuickSearchIndex,
} from '../lib/quickSearch';

describe('quick search index', () => {
  const originalIdle = (global as any).requestIdleCallback;

  beforeEach(() => {
    clearQuickSearchCache();
    (global as any).requestIdleCallback = originalIdle;
  });

  afterAll(() => {
    (global as any).requestIdleCallback = originalIdle;
  });

  it('builds an index with apps, files, and settings', () => {
    const index = getQuickSearchIndex();
    expect(index.apps.length).toBeGreaterThan(0);
    expect(index.files.map((item) => item.path)).toContain('/resume.pdf');
    expect(index.settings.some((item) => item.settingId === 'accent')).toBe(true);
  });

  it('reuses the cached index across calls', () => {
    const first = getQuickSearchIndex();
    const second = getQuickSearchIndex();
    expect(second).toBe(first);
  });

  it('filters results by query across sections', () => {
    const index = getQuickSearchIndex();
    const sections = filterQuickSearchIndex(index, 'resume');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('file');
    expect(sections[0].items[0].title.toLowerCase()).toContain('resume');
  });

  it('warms the cache during idle time', () => {
    clearQuickSearchCache();
    const idleSpy = jest.fn((cb: (deadline: any) => void) => {
      cb({ didTimeout: false, timeRemaining: () => 10 });
      return 1;
    });
    (global as any).requestIdleCallback = idleSpy;
    warmQuickSearchIndex();
    expect(idleSpy).toHaveBeenCalled();
    const index = getQuickSearchIndex();
    expect(index.apps.length).toBeGreaterThan(0);
  });
});
