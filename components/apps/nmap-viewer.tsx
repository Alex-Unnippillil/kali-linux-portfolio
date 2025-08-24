import React, { useState } from 'react';
import * as sax from 'sax';
import { validateXML } from 'xmllint-wasm';
import Papa from 'papaparse';

interface ScriptInfo {
  id: string;
  output: string;
}

interface PortInfo {
  portid: string;
  protocol: string;
  state: string;
  service?: string;
  product?: string;
  version?: string;
  scripts: ScriptInfo[];
}

interface HostInfo {
  address: string;
  hostnames: string[];
  ports: PortInfo[];
}

const NmapViewer: React.FC = () => {
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ state: 'open', protocol: 'all' });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setHosts([]);
    const text = await file.text();
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
              output: node.attributes['output'] as string,
            };
            currentPort.scripts.push(currentScript);
          }
          break;
        default:
          break;
      }
    };

    parser.onclosetag = (name) => {
      switch (name) {
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

    const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.write(value);
    }
    parser.close();
    setHosts(parsedHosts);
  };

  const exportCsv = () => {
    const rows = hosts.flatMap((h) =>
      h.ports.map((p) => ({
        host: h.address,
        port: p.portid,
        protocol: p.protocol,
        state: p.state,
        service: p.service || '',
        product: p.product || '',
        version: p.version || '',
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

  const exportMarkdown = () => {
    let md = '| Host | Port | Protocol | State | Service |\n| --- | --- | --- | --- | --- |\n';
    hosts.forEach((h) => {
      h.ports.forEach((p) => {
        md += `| ${h.address} | ${p.portid} | ${p.protocol} | ${p.state} | ${p.service || ''} |\n`;
      });
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredHosts = hosts.map((h) => ({
    ...h,
    ports: h.ports.filter((p) =>
      (filters.state === 'all' || p.state === filters.state) &&
      (filters.protocol === 'all' || p.protocol === filters.protocol)
    ),
  }));

  const portCounts: Record<string, number> = {};
  filteredHosts.forEach((h) =>
    h.ports.forEach((p) => {
      portCounts[p.portid] = (portCounts[p.portid] || 0) + 1;
    })
  );
  const maxCount = Math.max(1, ...Object.values(portCounts));

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col overflow-hidden">
      <div className="mb-4 space-y-2">
        <input type="file" accept=".xml" onChange={handleFile} />
        {error && <div className="text-red-500 whitespace-pre-wrap">{error}</div>}
        <div className="flex space-x-2">
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
          <button onClick={exportCsv} className="bg-blue-600 px-2 rounded">CSV</button>
          <button onClick={exportMarkdown} className="bg-blue-600 px-2 rounded">Markdown</button>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        {filteredHosts.map((h, i) => (
          <div key={i} className="mb-4">
            <h3 className="font-bold">{h.address}{h.hostnames.length ? ` (${h.hostnames.join(', ')})` : ''}</h3>
            <table className="w-full text-left border-collapse mb-2">
              <thead>
                <tr>
                  <th className="border-b p-1">Port</th>
                  <th className="border-b p-1">Protocol</th>
                  <th className="border-b p-1">State</th>
                  <th className="border-b p-1">Service</th>
                  <th className="border-b p-1">CVE</th>
                </tr>
              </thead>
              <tbody>
                {h.ports.map((p, j) => (
                  <tr key={j} className="odd:bg-gray-800">
                    <td className="p-1">{p.portid}</td>
                    <td className="p-1">{p.protocol}</td>
                    <td className="p-1">{p.state}</td>
                    <td className="p-1">{p.service || ''} {p.version || ''}</td>
                    <td className="p-1">
                      {p.service && (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {Object.keys(portCounts).length > 0 && (
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
