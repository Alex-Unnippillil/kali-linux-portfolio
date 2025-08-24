import { calculateBaseScore, humanizeScore } from 'cvss4';

describe('CVSS score calculations', () => {
  test('computes CVSS v3.1 score', () => {
    const vector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
    expect(calculateBaseScore(vector)).toBeCloseTo(9.8, 1);
    expect(humanizeScore(vector)).toBe('Critical');
  });

  test('computes CVSS v4.0 score', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H';
    expect(calculateBaseScore(vector)).toBeCloseTo(10, 1);
    expect(humanizeScore(vector)).toBe('Critical');
  });
});
