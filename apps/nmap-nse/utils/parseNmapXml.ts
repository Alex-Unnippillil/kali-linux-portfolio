import { XMLParser } from 'fast-xml-parser';
import type { Report, Host, Service, Vulnerability } from '../components/ReportView';

export default function parseNmapXml(xml: string): Report {
  const parser = new XMLParser({ ignoreAttributes: false });
  let json: any;
  try {
    json = parser.parse(xml);
  } catch {
    throw new Error('Invalid XML');
  }
  const hostData = json?.nmaprun?.host;
  const hostsArr = Array.isArray(hostData) ? hostData : hostData ? [hostData] : [];
  const hosts: Host[] = hostsArr.map((host: any) => {
    const addrNode = host.address;
    const addrVal = Array.isArray(addrNode) ? addrNode[0]?.['@_addr'] : addrNode?.['@_addr'];
    const address = addrVal || 'unknown';
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
    const hostScriptArr = Array.isArray(hostScripts) ? hostScripts : hostScripts ? [hostScripts] : [];
    const vulnerabilities: Vulnerability[] = hostScriptArr.map((s: any) => ({
      id: s['@_id'] || '',
      output: s['@_output'] || '',
    }));
    return { address, services, vulnerabilities };
  });
  return { hosts };
}
