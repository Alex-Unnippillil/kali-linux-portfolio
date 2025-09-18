import {
  DISPLAY_STORAGE_KEY,
  ensureDisplayConfig,
  generateDisplayId,
  loadDisplayConfig,
  saveDisplayConfig,
} from '../utils/displayState';

describe('displayState helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ensureDisplayConfig seeds defaults when no config exists', () => {
    expect(localStorage.getItem(DISPLAY_STORAGE_KEY)).toBeNull();
    const config = ensureDisplayConfig();
    expect(config).toEqual([{ id: 'display-1', name: 'Primary Display' }]);
    const stored = JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('display-1');
  });

  it('generateDisplayId avoids collisions even with gaps', () => {
    const nextId = generateDisplayId([
      { id: 'display-1', name: 'One' },
      { id: 'display-3', name: 'Three' },
    ]);
    expect(nextId).toBe('display-4');
  });

  it('saveDisplayConfig stores sanitized display definitions', () => {
    saveDisplayConfig([
      { id: 'display-1', name: null as unknown as string },
      { id: 'display-2', name: 'Workspace' },
    ]);
    const stored = loadDisplayConfig();
    expect(stored).toEqual([
      { id: 'display-1', name: '' },
      { id: 'display-2', name: 'Workspace' },
    ]);
  });
});
