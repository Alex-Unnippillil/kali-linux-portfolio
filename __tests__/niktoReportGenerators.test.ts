import {
  generateNiktoHtmlReport,
  generateNiktoJsonReport,
} from '../utils/niktoReportGenerators';

describe('nikto report generators', () => {
  const sampleFindings = [
    {
      path: '/admin',
      finding: 'Administration portal exposed',
      severity: 'High',
      references: ['OSVDB-1'],
      details: 'Login page revealed with default branding.',
    },
    {
      path: '/robots.txt',
      finding: 'Robots.txt reveals hidden paths',
      severity: 'Info',
      references: [],
      details: 'Includes /backup and /hidden-admin entries.',
    },
  ];

  const metadata = {
    target: {
      host: 'example.com',
      port: 443,
      protocol: 'https',
    },
    command: 'nikto -h example.com -ssl',
    filters: {
      severity: 'High',
      pathPrefix: '/a',
    },
    generatedAt: '2024-01-01T00:00:00.000Z',
    notes: 'Unit test metadata',
  } as const;

  it('produces HTML with legend, collapsible sections, and metadata', () => {
    const html = generateNiktoHtmlReport(sampleFindings, metadata);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Severity legend');
    expect(html).toContain('Nikto scan report');
    expect(html).toContain('example.com');
    expect(html).toContain(metadata.generatedAt);
    expect(html).toContain(metadata.command);
    expect(html).toMatch(/<details class=\"severity\"[^>]*>/);
  });

  it('produces JSON including timestamps, target info, and severity counts', () => {
    const report = generateNiktoJsonReport(sampleFindings, metadata);

    expect(report.generatedAt).toBe(metadata.generatedAt);
    expect(report.target).toEqual({
      host: 'example.com',
      port: 443,
      protocol: 'https',
    });
    expect(report.command).toBe(metadata.command);
    expect(report.summary.totalFindings).toBe(2);
    expect(report.summary.severityCounts.High).toBe(1);
    expect(report.summary.severityCounts.Info).toBe(1);
    expect(report.findings[0]).toEqual(
      expect.objectContaining({
        path: '/admin',
        severity: 'High',
        references: ['OSVDB-1'],
      })
    );
    expect(report.filters).toEqual({ severity: 'High', pathPrefix: '/a' });
  });

  it('normalizes missing data for resilient exports', () => {
    const report = generateNiktoJsonReport(
      [
        {
          path: undefined,
          finding: undefined,
          severity: 'Unknown',
        },
      ],
      {}
    );

    expect(report.target.host).toBe('unknown');
    expect(report.findings[0].path).toBe('unknown');
    expect(report.findings[0].severity).toBe('Unclassified');
    expect(report.summary.severityCounts.Unclassified).toBe(1);
  });
});
