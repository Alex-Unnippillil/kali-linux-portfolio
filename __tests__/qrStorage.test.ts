import { clearScans, loadScans, saveScans } from '../utils/qrStorage';

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

  it('handles localStorage quota errors gracefully', async () => {
    localStorage.setItem('qrScans', JSON.stringify(['existing']));
    const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const storageProto = Object.getPrototypeOf(window.localStorage);
    const setSpy = jest.spyOn(storageProto, 'setItem').mockImplementation(function () {
      throw quotaError;
    });
    const removeSpy = jest.spyOn(storageProto, 'removeItem');

    await expect(saveScans(['d'])).resolves.toBeUndefined();
    expect(removeSpy).toHaveBeenCalledWith('qrScans');
    expect(await loadScans()).toEqual([]);

    setSpy.mockRestore();
    removeSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
