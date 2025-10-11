import { cacheFont, clearFontCache, loadCachedFonts, removeCachedFont } from '../../components/apps/figlet/fontCache';

beforeEach(async () => {
  await clearFontCache();
});

describe('font cache', () => {
  it('stores and retrieves fonts from IndexedDB', async () => {
    await cacheFont('Shadow', 'shadow-data');
    await cacheFont('Standard', 'standard-data');

    const cached = await loadCachedFonts();
    const map = new Map(cached.map(({ name, data }) => [name, data]));

    expect(map.get('Shadow')).toBe('shadow-data');
    expect(map.get('Standard')).toBe('standard-data');
  });

  it('overwrites existing fonts by name', async () => {
    await cacheFont('Slant', 'first');
    await cacheFont('Slant', 'second');

    const cached = await loadCachedFonts();
    expect(cached.find((f) => f.name === 'Slant')?.data).toBe('second');
  });

  it('removes fonts when requested', async () => {
    await cacheFont('Banner', 'banner-data');
    await removeCachedFont('Banner');

    const cached = await loadCachedFonts();
    expect(cached.some((f) => f.name === 'Banner')).toBe(false);
  });
});
