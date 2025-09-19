export interface UrlsnarfEntry {
  protocol: string;
  host: string;
  path: string;
  details?: string;
}

export const buildUrlsnarfFixture = (
  entries: UrlsnarfEntry[] = [
    { protocol: 'HTTP', host: 'example.com', path: '/index.html' },
    { protocol: 'HTTPS', host: 'test.com', path: '/login' },
  ],
): string[] =>
  entries.map(({ protocol, host, path, details }) =>
    [protocol, host, path, details].filter(Boolean).join(' '),
  );

export interface ArpspoofEntry {
  host: string;
  mac: string;
  prefix?: string;
}

export const buildArpspoofFixture = (
  entries: ArpspoofEntry[] = [
    { host: '192.168.0.1', mac: '00:11:22:33:44:55' },
    { host: '192.168.0.2', mac: 'aa:bb:cc:dd:ee:ff' },
  ],
): string[] =>
  entries.map(({ prefix = 'ARP reply', host, mac }) => `${prefix} ${host} is-at ${mac}`);

export interface DsniffPcapSummaryEntry {
  src: string;
  dst: string;
  protocol: string;
  info: string;
}

export interface DsniffPcapFixture {
  summary: DsniffPcapSummaryEntry[];
  remediation: string[];
}

export const buildPcapFixture = (
  overrides: Partial<DsniffPcapFixture> = {},
): DsniffPcapFixture => {
  const base: DsniffPcapFixture = {
    summary: [
      {
        src: '192.168.0.5',
        dst: 'example.com',
        protocol: 'HTTP',
        info: 'POST /login username=demo password=demo123',
      },
    ],
    remediation: [
      'Use HTTPS/TLS to encrypt credentials in transit',
      'Avoid reusing passwords and implement MFA',
      'Monitor network for sniffing and unauthorized devices',
    ],
  };

  return {
    ...base,
    ...overrides,
    summary: overrides.summary ?? base.summary,
    remediation: overrides.remediation ?? base.remediation,
  };
};
