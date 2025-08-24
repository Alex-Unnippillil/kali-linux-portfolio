import React, { useMemo, useState } from 'react';
import * as sax from 'sax';
import { validateXML } from 'xmllint-wasm';
import Papa from 'papaparse';
import { FixedSizeList as List } from 'react-window';

interface VulnInfo {
  id: string;
  cvss?: string;
  summary?: string;
}

interface ScriptInfo {
  id: string;
  output: string;
  vulns: VulnInfo[];
}

interface PortInfo {
  portid: string;
  protocol: string;
  state: string;
  service?: string;
  product?: string;
  version?: string;
  scripts: ScriptInfo[];
  vulns: VulnInfo[];
  badges: string[];
}

interface HostInfo {
  address: string;
  hostnames: string[];
  ports: PortInfo[];
}

type Pivot = 'host' | 'port' | 'service';

const NmapViewer: React.FC = () => {
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    state: 'open',
    protocol: 'all',
    host: '',
    service: '',
    port: '',
    vuln: '',
  });
  const [pivot, setPivot] = useState<Pivot>('host');
  const [xmlText, setXmlText] = useState('');

  const processFile = async (file: File) => {
    setError(null);
    setHosts([]);
    let text: string;
    if (typeof (file as any).text === 'function') {
      text = await (file as any).text();
    } else {
      setError('Unable to read file');
      return;
    }
    setXmlText(text);
    const dtd = await fetch('/nmap.dtd').then((r) => r.text());
    const validation = await validateXML({ xml: text, dtd } as any);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    const parser = sax.parser(true, { lowercase: true, position: true });
    const parsedHosts: HostInfo[] = [];
    let currentHost: HostInfo | null = null;
    let currentPort: PortInfo | null = null;
    let currentScript: ScriptInfo | null = null;
    let inVulnsTable = false;
    let currentVuln: any = null;
    let currentElemKey: string | null = null;
    let currentElemText = '';

    parser.onerror = (err) => {
      setError(`Line ${parser.line + 1}: ${err.message}`);
      parser.resume();
    };

    parser.onopentag = (node) => {
      switch (node.name) {
        case 'host':
          currentHost = { address: '', hostnames: [], ports: [] };
          break;
        case 'address':
          if (currentHost) currentHost.address = node.attributes['addr'] as string;
          break;
        case 'hostname':
          if (currentHost) currentHost.hostnames.push(node.attributes['name'] as string);
          break;
        case 'port':
          if (currentHost) {
            currentPort = {
              portid: node.attributes['portid'] as string,
              protocol: node.attributes['protocol'] as string,
              state: '',
              scripts: [],
              vulns: [],
              badges: [],
            };
          }
          break;
        case 'state':
          if (currentPort) currentPort.state = node.attributes['state'] as string;
          break;
        case 'service':
          if (currentPort) {
            currentPort.service = node.attributes['name'] as string;
            currentPort.product = node.attributes['product'] as string;
            currentPort.version = node.attributes['version'] as string;
          }
          break;
        case 'script':
          if (currentPort) {
            currentScript = {
              id: node.attributes['id'] as string,
              output: (node.attributes['output'] as string) || '',
              vulns: [],
            };
            currentPort.scripts.push(currentScript);
          }
          break;
        case 'table':
          if (currentScript && node.attributes['key'] === 'vulns') {
            inVulnsTable = true;
          } else if (inVulnsTable && currentScript) {
            currentVuln = { id: node.attributes['key'] as string };
          }
          break;
        case 'elem':
          if (currentVuln) {
            currentElemKey = node.attributes['key'] as string;
            currentElemText = '';
          }
          break;
        default:
          break;
      }
    };

    parser.ontext = (txt) => {
      if (currentElemKey) currentElemText += txt;
    };

    parser.onclosetag = (name) => {
      switch (name) {
        case 'elem':
          if (currentVuln && currentElemKey) {
            currentVuln[currentElemKey] = currentElemText.trim();
            currentElemKey = null;
            currentElemText = '';
          }
          break;
        case 'table':
          if (inVulnsTable && currentVuln) {
            const id = currentVuln.id || currentVuln.ids || '';
            if (id && currentScript) {
              currentScript.vulns.push({
                id,
                cvss: currentVuln.cvss || currentVuln.score,
                summary:
                  currentVuln.summary || currentVuln.title || currentVuln.desc,
              });
            }
            currentVuln = null;
          } else if (inVulnsTable) {
            inVulnsTable = false;
          }
          break;
        case 'script':
          if (currentPort && currentScript) {
            const out = currentScript.output.toLowerCase();
            const id = currentScript.id.toLowerCase();
            const badgeSet = new Set(currentPort.badges);
            if (/ssl|tls/.test(id) || /ssl|tls/.test(out)) badgeSet.add('TLS');
            if (
              /hsts|strict-transport-security/.test(id) ||
              /strict-transport-security/.test(out)
            )
              badgeSet.add('HSTS');
            if (
              /csp|content-security-policy/.test(id) ||
              /content-security-policy/.test(out)
            )
              badgeSet.add('CSP');
            currentPort.badges = Array.from(badgeSet);
            if (currentScript.vulns.length) {
              currentPort.vulns.push(...currentScript.vulns);
            }
          }
          currentScript = null;
          break;
        case 'port':
          if (currentHost && currentPort) currentHost.ports.push(currentPort);
          currentPort = null;
          break;
        case 'host':
          if (currentHost) parsedHosts.push(currentHost);
          currentHost = null;
          break;
        default:
          break;
      }
    };

    if ((file as any).stream && typeof TextDecoderStream !== 'undefined') {
      const reader = (file as any)
        .stream()
        .pipeThrough(new TextDecoderStream())
        .getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.write(value);
      }
    } else {
      parser.write(text);
    }
    parser.close();
    setHosts(parsedHosts);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const filteredHosts = useMemo(
    () =>
      hosts
        .filter((h) => {
          const q = filters.host.toLowerCase();
          return (
            !q ||
            h.address.toLowerCase().includes(q) ||
            h.hostnames.some((n) => n.toLowerCase().includes(q))
          );
        })
        .map((h) => ({
          ...h,
          ports: h.ports.filter(
            (p) =>
              (filters.state === 'all' || p.state === filters.state) &&
              (filters.protocol === 'all' || p.protocol === filters.protocol) &&
              (!filters.service ||
                (p.service || '')
                  .toLowerCase()
                  .includes(filters.service.toLowerCase())) &&
              (!filters.port || p.portid.includes(filters.port)) &&
              (!filters.vuln ||
                p.vulns.some((v) =>
                  v.id.toLowerCase().includes(filters.vuln.toLowerCase())
                ))
          ),
        }))
        .filter((h) => h.ports.length > 0),
    [hosts, filters]
  );

  const pivoted = useMemo(() => {
    if (pivot === 'host') return filteredHosts;
    const map: Record<string, { key: string; items: { host: string; port: PortInfo }[] }> = {};
    filteredHosts.forEach((h) =>
      h.ports.forEach((p) => {
        const key = pivot === 'port' ? p.portid : p.service || 'unknown';
        if (!map[key]) map[key] = { key, items: [] };
        map[key].items.push({ host: h.address, port: p });
      })
    );
    return Object.values(map);
  }, [filteredHosts, pivot]);

  const exportHtml = async () => {
    if (!xmlText) return;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    const xslText = await fetch('/nmap.xsl').then((r) => r.text());
    const xslDoc = parser.parseFromString(xslText, 'application/xml');
    const proc = new XSLTProcessor();
    proc.importStylesheet(xslDoc);
    const resultDoc = (proc as any).transformToDocument(xmlDoc);
    const html = new XMLSerializer().serializeToString(resultDoc);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = filteredHosts.flatMap((h) =>
      h.ports.map((p) => ({
        host: h.address,
        port: p.portid,
        protocol: p.protocol,
        state: p.state,
        service: p.service || '',
        product: p.product || '',
        version: p.version || '',
        vulns: p.vulns.map((v) => v.id).join(';'),
      }))
    );
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const json = JSON.stringify(filteredHosts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const portCounts: Record<string, number> = {};
  if (pivot === 'host') {
    filteredHosts.forEach((h) =>
      h.ports.forEach((p) => {
        portCounts[p.portid] = (portCounts[p.portid] || 0) + 1;
      })
    );
  }
  const maxCount = Math.max(1, ...Object.values(portCounts));

  return (
    <div
      className="h-full w-full bg-gray-900 text-white p-4 flex flex-col overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      data-testid="drop-zone"
    >
      <div className="mb-4 space-y-2">
        <input type="file" accept=".xml" onChange={handleFile} data-testid="file-input" />
        {error && <div className="text-red-500 whitespace-pre-wrap">{error}</div>}
        <div className="flex space-x-2 flex-wrap">
          <input
            value={filters.host}
            onChange={(e) => setFilters({ ...filters, host: e.target.value })}
            placeholder="Host"
            className="text-black px-1"
          />
          <input
            value={filters.service}
            onChange={(e) => setFilters({ ...filters, service: e.target.value })}
            placeholder="Service"
            className="text-black px-1"
          />
          <input
            value={filters.port}
            onChange={(e) => setFilters({ ...filters, port: e.target.value })}
            placeholder="Port"
            className="text-black px-1 w-20"
          />
          <input
            value={filters.vuln}
            onChange={(e) => setFilters({ ...filters, vuln: e.target.value })}
            placeholder="Vuln"
            className="text-black px-1"
          />
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="text-black"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <select
            value={filters.protocol}
            onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
            className="text-black"
          >
            <option value="all">All Protocols</option>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
          <select
            value={pivot}
            onChange={(e) => setPivot(e.target.value as Pivot)}
            className="text-black"
          >
            <option value="host">By Host</option>
            <option value="port">By Port</option>
            <option value="service">By Service</option>
          </select>
          <button onClick={exportCsv} className="bg-blue-600 px-2 rounded">
            CSV
          </button>
          <button onClick={exportJson} className="bg-blue-600 px-2 rounded">
            JSON
          </button>
          <button onClick={exportHtml} className="bg-blue-600 px-2 rounded">
            HTML
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        {pivot === 'host'
          ? filteredHosts.map((h, i) => (
              <div key={i} className="mb-4">
                <h3 className="font-bold">
                  {h.address}
                  {h.hostnames.length ? ` (${h.hostnames.join(', ')})` : ''}
                </h3>
                <div className="table w-full text-left border-collapse mb-2">
                  <div className="table-header-group">
                    <div className="table-row">
                      <div className="table-cell border-b p-1">Port</div>
                      <div className="table-cell border-b p-1">Protocol</div>
                      <div className="table-cell border-b p-1">State</div>
                      <div className="table-cell border-b p-1">Service</div>
                      <div className="table-cell border-b p-1">Scripts</div>
                      <div className="table-cell border-b p-1">Badges</div>
                      <div className="table-cell border-b p-1">Vulns</div>
                    </div>
                  </div>
                  <List
                    height={Math.min(300, h.ports.length * 35)}
                    itemCount={h.ports.length}
                    itemSize={35}
                    width={'100%'}
                  >
                    {({ index, style }) => {
                      const p = h.ports[index];
                      return (
                        <div style={style} className="table-row odd:bg-gray-800">
                          <div className="table-cell p-1">{p.portid}</div>
                          <div className="table-cell p-1">{p.protocol}</div>
                          <div className="table-cell p-1">{p.state}</div>
                          <div className="table-cell p-1">{p.service || ''} {p.version || ''}</div>
                          <div className="table-cell p-1 space-y-1">
                            {p.scripts.map((s) => (
                              <div key={s.id}>
                                <span className="font-bold">{s.id}:</span> {s.output}
                              </div>
                            ))}
                          </div>
                          <div className="table-cell p-1">
                            {p.badges.map((b) => (
                              <span
                                key={b}
                                className="bg-gray-700 text-xs px-1 rounded mr-1"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                          <div className="table-cell p-1">
                            {p.vulns.length > 0 ? (
                              <ul>
                                {p.vulns.map((v) => (
                                  <li key={v.id}>
                                    <a
                                      href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${v.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 underline"
                                    >
                                      {v.id}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              p.service && (
                                <a
                                  href={`https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${encodeURIComponent(
                                    (p.service || '') + ' ' + (p.version || '')
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 underline"
                                >
                                  Search
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }}
                  </List>
                </div>
              </div>
            ))
          : pivoted.map((g) => (
              <div key={g.key} className="mb-4">
                <h3 className="font-bold">
                  {pivot === 'port' ? `Port ${g.key}` : g.key}
                </h3>
                <table className="w-full text-left border-collapse mb-2">
                  <thead>
                    <tr>
                      <th className="border-b p-1">Host</th>
                      {pivot === 'port' && <th className="border-b p-1">Service</th>}
                      {pivot === 'service' && <th className="border-b p-1">Port</th>}
                      <th className="border-b p-1">Protocol</th>
                      <th className="border-b p-1">State</th>
                      <th className="border-b p-1">Scripts</th>
                      <th className="border-b p-1">Badges</th>
                      <th className="border-b p-1">Vulns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map(({ host, port }) => (
                      <tr key={host + port.portid} className="odd:bg-gray-800">
                        <td className="p-1">{host}</td>
                        {pivot === 'port' && (
                          <td className="p-1">{port.service || ''}</td>
                        )}
                        {pivot === 'service' && (
                          <td className="p-1">{port.portid}</td>
                        )}
                        <td className="p-1">{port.protocol}</td>
                        <td className="p-1">{port.state}</td>
                        <td className="p-1 space-y-1">
                          {port.scripts.map((s) => (
                            <div key={s.id}>
                              <span className="font-bold">{s.id}:</span> {s.output}
                            </div>
                          ))}
                        </td>
                        <td className="p-1">
                          {port.badges.map((b) => (
                            <span
                              key={b}
                              className="bg-gray-700 text-xs px-1 rounded mr-1"
                            >
                              {b}
                            </span>
                          ))}
                        </td>
                        <td className="p-1">
                          {port.vulns.length > 0 ? (
                            <ul>
                              {port.vulns.map((v) => (
                                <li key={v.id}>
                                  <a
                                    href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${v.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 underline"
                                  >
                                    {v.id}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            port.service && (
                              <a
                                href={`https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${encodeURIComponent(
                                  (port.service || '') + ' ' + (port.version || '')
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline"
                              >
                                Search
                              </a>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
      </div>
      {pivot === 'host' && Object.keys(portCounts).length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold">Port Distribution</h4>
          <div className="flex items-end space-x-1 h-32">
            {Object.entries(portCounts).map(([port, count]) => (
              <div
                key={port}
                title={`${port}: ${count}`}
                className="bg-blue-500 w-4"
                style={{ height: `${(count / maxCount) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NmapViewer;

export const displayNmapViewer = (addFolder: any, openApp: any) => (
  <NmapViewer />
);
