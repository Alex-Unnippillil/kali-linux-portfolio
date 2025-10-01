import { detectFontGroups } from '../utils/fontLoader';

describe('detectFontGroups', () => {
  it('returns an empty array for latin-only content', () => {
    expect(detectFontGroups('The quick brown fox jumps over the lazy dog.')).toEqual([]);
  });

  it('detects CJK characters', () => {
    expect(detectFontGroups('你好，世界')).toEqual(['cjk']);
    expect(detectFontGroups('カリ・リナックス')).toEqual(['cjk']);
  });

  it('detects RTL scripts and supports mixed content', () => {
    expect(detectFontGroups('مرحبا بالعالم')).toEqual(['rtl']);
    const mixed = detectFontGroups('Security 工具 مرحباً');
    expect(mixed).toContain('cjk');
    expect(mixed).toContain('rtl');
  });
});
