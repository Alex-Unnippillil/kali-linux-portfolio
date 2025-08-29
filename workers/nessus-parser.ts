import { XMLParser } from 'fast-xml-parser';

export interface Finding {
  host: string;
  id: string;
  name: string;
  cvss: number;
  severity: string;
  description: string;
  solution: string;
}

export const parseNessus = (data: string): Finding[] => {
  const parser = new XMLParser({ ignoreAttributes: false });
  const json = parser.parse(data);
  const reportHosts = json?.NessusClientData_v2?.Report?.ReportHost;
  const hosts = Array.isArray(reportHosts) ? reportHosts : [reportHosts];
  const findings: Finding[] = [];
  hosts.forEach((host: any) => {
    if (!host) return;
    const hostName =
      host['@_name'] ||
      host?.HostProperties?.tag?.find(
        (t: any) => t['@_name'] === 'host-ip'
      )?.['#text'] ||
      'unknown';
    const items = Array.isArray(host.ReportItem)
      ? host.ReportItem
      : [host.ReportItem];
    items.forEach((item: any) => {
      if (!item) return;
      const finding: Finding = {
        host: hostName,
        id: String(item['@_pluginID'] || ''),
        name: item['@_pluginName'] || '',
        cvss: parseFloat(item.cvss3_base_score || item.cvss_base_score || '0'),
        severity: item.risk_factor || 'Unknown',
        description: item.description || '',
        solution: item.solution || '',
      };
      findings.push(finding);
    });
  });
  return findings;
};

self.onmessage = ({ data }: MessageEvent<string>) => {
  try {
    const findings = parseNessus(data);
    self.postMessage({ findings });
  } catch (err: any) {
    self.postMessage({ error: err?.message || 'Parse failed' });
  }
};

export {};
