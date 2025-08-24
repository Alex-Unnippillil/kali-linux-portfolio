import licenseList from 'spdx-license-list/full';
import { matchLicense } from '@lib/licenseMatcher';

describe('matchLicense', () => {
  it('identifies MIT license text', () => {
    const mitText = (licenseList as any).MIT.licenseText as string;
    const result = matchLicense(mitText);
    expect(result.ambiguous).toBe(false);
    expect(result.matches[0].spdxId).toBe('MIT');
    expect(result.matches[0].confidence).toBe(1);
  });

  it('flags ambiguous license text', () => {
    const result = matchLicense('This license text is too short to identify.');
    expect(result.ambiguous).toBe(true);
    expect(result.message).toBeDefined();
  });
});

