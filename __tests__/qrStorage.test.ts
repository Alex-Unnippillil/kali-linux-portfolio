import { clearScans, loadScans, saveScans } from '@/utils';

describe('qrStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads scans', async () => {
    await saveScans(['a', 'b']);
    const loaded = await loadScans();
    expect(loaded).toEqual(['a', 'b']);
  });

  it('clears scans', async () => {
    await saveScans(['c']);
    await clearScans();
    const loaded = await loadScans();
    expect(loaded).toEqual([]);
  });
});
