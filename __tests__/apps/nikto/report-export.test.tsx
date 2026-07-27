import {
  generateNiktoHtmlReport,
  generateNiktoJsonReport,
  type NiktoFinding,
  type NiktoReportMetadata,
} from '../../../components/apps/nikto/report';

describe('Nikto report export service', () => {
  const findings: NiktoFinding[] = [
    {
      path: '/admin',
      finding: 'Administrative interface exposed.',
      references: ['OSVDB-1234'],
      severity: 'High',
      details: 'The /admin panel should be access controlled.',
    },
    {
      path: '/cgi-bin/test',
      finding: 'Outdated CGI script detected.',
      references: ['CVE-2012-1823'],
      severity: 'Medium',
      details: 'Review and patch legacy CGI handlers.',
    },
    {
      path: '/',
      finding: 'Informational header returned.',
      references: [],
      severity: 'Info',
      details: 'ETag present in response.',
    },
  ];

  const metadata: NiktoReportMetadata = {
    target: {
      host: 'example.com',
      port: '443',
      ssl: true,
      url: 'https://example.com:443',
    },
    command: 'nikto -h example.com -p 443 -ssl',
    generatedAt: '2023-10-31T10:00:00.000Z',
  };

  it('creates an HTML document with collapsible sections and legend', () => {
    const report = generateNiktoHtmlReport(findings, metadata);
    expect(report).toMatchSnapshot();
  });

  it('creates a JSON export with metadata and totals', () => {
    const report = generateNiktoJsonReport(findings, metadata);
    expect(report).toMatchSnapshot();
  });
});
