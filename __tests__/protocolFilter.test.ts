import { filterLogsByProtocol, countProtocols } from '@/utils';

describe('filterLogsByProtocol', () => {
  const logs = [
    'HTTP GET /index.html',
    'HTTPS handshake started',
    'Arp who-has 10.0.0.1',
    'ftp transfer complete',
    'SSH connection established',
    'Random line',
    'https second line',
    'ssh another login',
  ];

  it('filters logs and counts per protocol', () => {
    const result = filterLogsByProtocol(logs);
    expect(result.HTTP.count).toBe(1);
    expect(result.HTTPS.count).toBe(2);
    expect(result.ARP.count).toBe(1);
    expect(result.FTP.count).toBe(1);
    expect(result.SSH.count).toBe(2);

    expect(result.HTTPS.lines).toEqual([
      'HTTPS handshake started',
      'https second line',
    ]);
  });

  it('returns counts only', () => {
    const counts = countProtocols(logs.join('\n'));
    expect(counts).toEqual({ HTTP: 1, HTTPS: 2, ARP: 1, FTP: 1, SSH: 2 });
  });
});

