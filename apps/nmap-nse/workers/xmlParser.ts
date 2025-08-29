import { XMLParser } from 'fast-xml-parser';

interface Vulnerability {
  id: string;
  output: string;
}

interface Service {
  port: number;
  name: string;
  vulnerabilities: Vulnerability[];
}

interface Host {
  address: string;
  services: Service[];
  vulnerabilities: Vulnerability[];
}

interface Report {
  hosts: Host[];
}

self.onmessage = ({ data }: MessageEvent<string>) => {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(data);
    const hostData = json?.nmaprun?.host;
    const hostsArr = Array.isArray(hostData) ? hostData : hostData ? [hostData] : [];
    const hosts: Host[] = hostsArr.map((host: any) => {
      const addr = Array.isArray(host.address)
        ? host.address[0]?.['@_addr']
        : host.address?.['@_addr'];
      const address = addr || 'unknown';
      const ports = host.ports?.port;
      const portArr = Array.isArray(ports) ? ports : ports ? [ports] : [];
      const services: Service[] = portArr.map((p: any) => {
        const port = parseInt(p['@_portid'] || '0', 10);
        const name = p.service?.['@_name'] || '';
        const scripts = p.script;
        const scriptArr = Array.isArray(scripts) ? scripts : scripts ? [scripts] : [];
        const vulnerabilities: Vulnerability[] = scriptArr.map((s: any) => ({
          id: s['@_id'] || '',
          output: s['@_output'] || '',
        }));
        return { port, name, vulnerabilities };
      });
      const hostScripts = host.hostscript?.script;
      const hostScriptArr = Array.isArray(hostScripts)
        ? hostScripts
        : hostScripts
        ? [hostScripts]
        : [];
      const vulnerabilities: Vulnerability[] = hostScriptArr.map((s: any) => ({
        id: s['@_id'] || '',
        output: s['@_output'] || '',
      }));
      return { address, services, vulnerabilities };
    });
    const report: Report = { hosts };
    self.postMessage(report);
  } catch (err: any) {
    self.postMessage({ error: err?.message || 'Parse failed' });
  }
};

export {};

