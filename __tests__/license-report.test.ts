import licenseList from 'spdx-license-list/full';
import { generateLicenseReport } from '@lib/licenseReport';

describe('generateLicenseReport', () => {
  it('maps files to SPDX identifiers', () => {
    const files = {
      'MIT.txt': (licenseList as any).MIT.licenseText as string,
      'Apache.txt': (licenseList as any)['Apache-2.0'].licenseText as string,
    };
    const report = generateLicenseReport(files);
    const ids = report.files.map((f) => f.fuzzy.matches[0]?.spdxId);
    expect(ids).toContain('MIT');
    expect(ids).toContain('Apache-2.0');
  });

  it('highlights conflicting licenses', () => {
    const files = {
      'GPL.txt': 'GPL-2.0-only',
      'Apache.txt': 'Apache-2.0',
    };
    const report = generateLicenseReport(files);
    expect(report.conflicts.length).toBeGreaterThan(0);
    expect(report.conflicts[0].licenses).toEqual(['GPL-2.0-only', 'Apache-2.0']);
  });
});

