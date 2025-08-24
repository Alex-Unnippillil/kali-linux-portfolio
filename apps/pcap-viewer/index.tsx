import React, { useState, useEffect } from 'react';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type FlowInfo = { flow: string; start: number; end: number };
type PacketInfo = { flow: string; proto: string; data: Uint8Array };
type ParseResult = { flows: FlowInfo[]; protocols: Record<string, number>; packets: PacketInfo[] };

const PcapViewer: React.FC = () => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [flows, setFlows] = useState<FlowInfo[]>([]);
  const [protocols, setProtocols] = useState<Record<string, number>>({});
  const [packets, setPackets] = useState<PacketInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PacketInfo | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('./parserWorker.ts', import.meta.url));
    w.onmessage = (e) => {
      const { type, result, error } = e.data;
      if (type === 'result') {
        const r: ParseResult = result;
        setFlows(r.flows);
        setProtocols(r.protocols);
        setPackets(r.packets);
        setSelected(null);
        setError('');
      } else if (type === 'error') {
        setError(error);
      }
    };
    setWorker(w);
    return () => w.terminate();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !worker) return;
    if (file.size > MAX_SIZE) {
      setError('File too large');
      return;
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    worker.postMessage({ type: 'parse', buffer }, { transfer: [buffer.buffer] });
  };

  const matchesFilter = (p: PacketInfo) => {
    const q = filter.toLowerCase();
    if (q.startsWith('proto:')) return p.proto.toLowerCase() === q.slice(6);
    if (q.startsWith('flow:')) return p.flow.toLowerCase().includes(q.slice(5));
    return p.flow.toLowerCase().includes(q) || p.proto.toLowerCase().includes(q);
  };

  const filteredPackets = packets.filter(matchesFilter);

  const downloadFiltered = () => {
    const data = JSON.stringify(
      filteredPackets.map((p) => ({ flow: p.flow, proto: p.proto, data: Array.from(p.data) }))
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-2 text-white bg-ub-cool-grey h-full overflow-auto text-xs">
      <input type="file" accept=".pcap,.pcapng" onChange={handleFile} disabled={!worker} className="mb-2" />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <input
        type="text"
        placeholder="Filter (proto:tcp or flow:1.2.3.4)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-2 w-full text-black px-1"
      />
      <button onClick={downloadFiltered} className="mb-2 px-2 py-1 bg-ub-blue text-white">
        Download Filtered
      </button>
      <div className="mb-2">
        {Object.entries(protocols).map(([p, c]) => (
          <span key={p} className="mr-2">{p}: {c}</span>
        ))}
      </div>
      <ul>
        {filteredPackets.map((p, i) => (
          <li key={i} className="mb-1 cursor-pointer" onClick={() => setSelected(p)}>
            {p.flow} [{p.proto}]
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-2">
          <div className="mb-1">Hex:</div>
          <pre className="overflow-x-auto">
            {Array.from(selected.data)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ')}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PcapViewer;

