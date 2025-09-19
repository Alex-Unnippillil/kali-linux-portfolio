import { identifyHashType } from '@/components/apps/john/utils';

describe('identifyHashType', () => {
  it('detects common hash types', () => {
    expect(identifyHashType('d41d8cd98f00b204e9800998ecf8427e')).toBe('MD5');
    expect(
      identifyHashType('da39a3ee5e6b4b0d3255bfef95601890afd80709')
    ).toBe('SHA1');
    expect(
      identifyHashType(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      )
    ).toBe('SHA256');
    expect(identifyHashType('$2y$10$' + 'a'.repeat(53))).toBe('bcrypt');
    expect(identifyHashType('notahash')).toBe('Unknown');
  });
});
