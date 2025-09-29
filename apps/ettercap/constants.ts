export interface SampleFilter {
  name: string;
  code: string;
}

export const DEFAULT_SAMPLES: SampleFilter[] = [
  { name: 'Drop DNS', code: 'drop DNS' },
  { name: 'Replace example.com', code: 'replace example.com test.com' },
];

export const EXAMPLE_PACKETS = [
  'DNS query example.com',
  'HTTP GET /index.html',
  'SSH handshake from 10.0.0.1',
];
