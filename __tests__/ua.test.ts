import { detectArch } from '../lib/ua';

describe('detectArch', () => {
  it('uses UA data when available', async () => {
    const hint = await detectArch('', {
      getHighEntropyValues: async () => ({ architecture: 'arm64' }),
    });
    expect(hint).toBe('arm64');
  });

  it('parses x64 from UA string', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const hint = await detectArch(ua);
    expect(hint).toBe('x64');
  });

  it('returns unknown when no hint found', async () => {
    const hint = await detectArch('Some UA');
    expect(hint).toBe('unknown');
  });
});
