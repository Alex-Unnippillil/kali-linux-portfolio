import { parseCvss } from '@lib/cvss';

describe('parseCvss', () => {
  test('parses CVSS v3.1 vector', () => {
    const info = parseCvss('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    expect(info?.score).toBeCloseTo(9.8, 1);
    expect(info?.impact).toBeCloseTo(5.9, 1);
    expect(info?.exploitability).toBeCloseTo(3.9, 1);
  });

  test('parses CVSS v4.0 vector', () => {
    const info = parseCvss('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H');
    expect(info?.score).toBeCloseTo(10, 1);
    expect(info?.impact).toBeNull();
    expect(info?.exploitability).toBeNull();
  });
});
