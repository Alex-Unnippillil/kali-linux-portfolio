import licenseList from 'spdx-license-list/full';
import {
  matchLicense,
  parseSpdxExpression,
  detectLicenseConflicts,
} from '@lib/licenseMatcher';

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

describe('SPDX expression handling', () => {
  it('parses OR expressions', () => {
    const parsed = parseSpdxExpression('MIT OR Apache-2.0');
    expect(parsed.ids).toEqual(['MIT', 'Apache-2.0']);
    expect(parsed.hasOr).toBe(true);
  });

  it('detects conflicts in AND expressions', () => {
    const parsed = parseSpdxExpression('GPL-2.0-only AND Apache-2.0');
    const conflicts = detectLicenseConflicts(parsed.ids, parsed.hasAnd);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].licenses).toEqual(['GPL-2.0-only', 'Apache-2.0']);
  });
});

