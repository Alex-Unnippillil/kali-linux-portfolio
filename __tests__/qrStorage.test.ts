import {
  clearScans,
  loadScans,
  saveScans,
  type QRScan,
} from '../utils/qrStorage';

describe('qrStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads scans', async () => {
    const scans: QRScan[] = [
      { data: 'a', annotation: 'note a' },
      { data: 'b', annotation: '' },
    ];
    await saveScans(scans);
    const loaded = await loadScans();
    expect(loaded).toEqual(scans);
  });

  it('clears scans', async () => {
    await saveScans([{ data: 'c', annotation: '' }]);
    await clearScans();
    const loaded = await loadScans();
    expect(loaded).toEqual([]);
  });

  it('loads legacy string array format', async () => {
    localStorage.setItem('qrScans', JSON.stringify(['x']));
    const loaded = await loadScans();
    expect(loaded).toEqual([{ data: 'x', annotation: '' }]);
  });
});
