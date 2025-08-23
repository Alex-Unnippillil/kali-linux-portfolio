import React, { useState } from 'react';

interface Port {
  portid: number;
  service?: string;
}

interface Host {
  address: string;
  ports: Port[];
}

const NmapViewer: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'address' | 'ports'>('address');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleFile = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.xml') || text.trim().startsWith('<?xml')) {
      parseXML(text);
    } else {
      parseGrep(text);
    }
  };

  const parseXML = (text: string) => {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const hostNodes = Array.from(xml.getElementsByTagName('host'));
      const parsed: Host[] = hostNodes
        .map((h) => {
          const address = h.getElementsByTagName('address')[0]?.getAttribute('addr') || '';
          const ports = Array.from(h.getElementsByTagName('port'))
            .filter((p) => p.getElementsByTagName('state')[0]?.getAttribute('state') === 'open')
            .map((p) => ({
              portid: parseInt(p.getAttribute('portid') || '0', 10),
              service: p.getElementsByTagName('service')[0]?.getAttribute('name') || undefined,
            }));
          return { address, ports } as Host;
        })
        .filter((h) => h.ports.length > 0);
      setHosts(parsed);
    } catch (e) {
      // ignore parse errors
      setHosts([]);
    }
  };

  const parseGrep = (text: string) => {
    const lines = text.split('\n');
    const parsed: Host[] = [];
    lines.forEach((line) => {
      if (!line.startsWith('Host:')) return;
      const mHost = line.match(/^Host:\s+(\S+)/);
      if (!mHost) return;
      const address = mHost[1];
      const portSection = line.split('Ports:')[1];
      if (!portSection) return;
      const ports = portSection
        .split(',')
        .map((p) => {
          const parts = p.trim().split('/');
          return {
            portid: parseInt(parts[0], 10),
            state: parts[1],
            service: parts[4],
          };
        })
        .filter((p) => p.state === 'open')
        .map((p) => ({ portid: p.portid, service: p.service }));
      if (ports.length > 0) parsed.push({ address, ports });
    });
    setHosts(parsed);
  };

  const filtered = hosts.filter(
    (h) =>
      h.address.includes(search) ||
      h.ports.some((p) => `${p.portid}`.includes(search) || p.service?.includes(search))
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'address') {
      return sortDir === 'asc'
        ? a.address.localeCompare(b.address)
        : b.address.localeCompare(a.address);
    }
    const diff = a.ports.length - b.ports.length;
    return sortDir === 'asc' ? diff : -diff;
  });

  const totalPorts = hosts.reduce((sum, h) => sum + h.ports.length, 0);

  const changeSort = (field: 'address' | 'ports') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white text-black dark:bg-gray-900 dark:text-white p-4">
      <div className="mb-4 space-y-2">
        <input
          type="file"
          accept=".xml,.nmap,.txt,.log"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block"
        />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1 text-black"
        />
        <div className="text-sm">Hosts: {hosts.length} | Open Ports: {totalPorts}</div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th
                className="cursor-pointer border-b p-2 text-left"
                onClick={() => changeSort('address')}
              >
                Host {sortField === 'address' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="cursor-pointer border-b p-2 text-left"
                onClick={() => changeSort('ports')}
              >
                Open Ports {sortField === 'ports' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <tr key={h.address} className="odd:bg-gray-100 odd:dark:bg-gray-800">
                <td className="border-b p-2 font-mono">{h.address}</td>
                <td className="border-b p-2">
                  {h.ports
                    .map((p) => `${p.portid}${p.service ? `/${p.service}` : ''}`)
                    .join(', ')}{' '}
                  ({h.ports.length})
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={2} className="p-2 text-center">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NmapViewer;

