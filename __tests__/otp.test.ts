import { hotp } from 'otplib';

describe('OTP vectors', () => {
  const secrets = {
    sha1: Buffer.from('12345678901234567890').toString('hex'),
    sha256: Buffer.from('12345678901234567890123456789012').toString('hex'),
    sha512: Buffer.from(
      '1234567890123456789012345678901234567890123456789012345678901234'
    ).toString('hex'),
  } as const;

  test('HOTP RFC4226 test values', () => {
    hotp.options = { digits: 6, algorithm: 'sha1' as any, encoding: 'hex' };
    const counters = [0,1,2,3,4,5,6,7,8,9];
    const expected = ['755224','287082','359152','969429','338314','254676','287922','162583','399871','520489'];
    counters.forEach((c, idx) => {
      expect((hotp as any).generate(secrets.sha1, c)).toBe(expected[idx]);
    });
  });

  test('TOTP RFC6238 test values', () => {
    const vectors = [
      { time: 59, sha1: '94287082', sha256: '46119246', sha512: '90693936' },
      { time: 1111111109, sha1: '07081804', sha256: '68084774', sha512: '25091201' },
      { time: 1234567890, sha1: '89005924', sha256: '91819424', sha512: '93441116' },
    ];
    vectors.forEach(v => {
      hotp.options = { digits: 8, algorithm: 'sha1' as any, encoding: 'hex' };
      expect((hotp as any).generate(secrets.sha1, Math.floor(v.time / 30))).toBe(v.sha1);
      hotp.options = { digits: 8, algorithm: 'sha256' as any, encoding: 'hex' };
      expect((hotp as any).generate(secrets.sha256, Math.floor(v.time / 30))).toBe(v.sha256);
      hotp.options = { digits: 8, algorithm: 'sha512' as any, encoding: 'hex' };
      expect((hotp as any).generate(secrets.sha512, Math.floor(v.time / 30))).toBe(v.sha512);
    });
  });
});
