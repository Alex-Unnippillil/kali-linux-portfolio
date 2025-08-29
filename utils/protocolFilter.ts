export interface ProtocolResult {
  lines: string[];
  count: number;
}

export interface ProtocolFilterOutput {
  HTTP: ProtocolResult;
  HTTPS: ProtocolResult;
  ARP: ProtocolResult;
  FTP: ProtocolResult;
  SSH: ProtocolResult;
}

const initialResult = (): ProtocolFilterOutput => ({
  HTTP: { lines: [], count: 0 },
  HTTPS: { lines: [], count: 0 },
  ARP: { lines: [], count: 0 },
  FTP: { lines: [], count: 0 },
  SSH: { lines: [], count: 0 },
});

/**
 * Filters log lines by protocol keywords and returns matched lines with counts.
 * Matching is case-insensitive and uses word boundaries.
 */
export function filterLogsByProtocol(
  logs: string | string[],
): ProtocolFilterOutput {
  const result = initialResult();
  const lines = Array.isArray(logs) ? logs : logs.split(/\r?\n/);

  const re = {
    https: /\bhttps\b/i,
    http: /\bhttp\b/i,
    arp: /\barp\b/i,
    ftp: /\bftp\b/i,
    ssh: /\bssh\b/i,
  };

  for (const line of lines) {
    if (re.https.test(line)) {
      result.HTTPS.lines.push(line);
      result.HTTPS.count++;
    } else if (re.http.test(line)) {
      result.HTTP.lines.push(line);
      result.HTTP.count++;
    }
    if (re.arp.test(line)) {
      result.ARP.lines.push(line);
      result.ARP.count++;
    }
    if (re.ftp.test(line)) {
      result.FTP.lines.push(line);
      result.FTP.count++;
    }
    if (re.ssh.test(line)) {
      result.SSH.lines.push(line);
      result.SSH.count++;
    }
  }

  return result;
}

/**
 * Convenience helper that returns just the counts for each protocol.
 */
export function countProtocols(logs: string | string[]) {
  const { HTTP, HTTPS, ARP, FTP, SSH } = filterLogsByProtocol(logs);
  return { HTTP: HTTP.count, HTTPS: HTTPS.count, ARP: ARP.count, FTP: FTP.count, SSH: SSH.count };
}

