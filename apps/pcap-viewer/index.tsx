import React, { useState, useEffect } from 'react';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type FlowInfo = { flow: string; start: number; end: number };

type ParseResult = { flows: FlowInfo[]; protocols: Record<string, number> };

const PcapViewer: React.FC = () => {
  const [parser, setParser] = useState<null | ((data: Uint8Array) => ParseResult)>(null);
  const [flows, setFlows] = useState<FlowInfo[]>([]);
  const [protocols, setProtocols] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // @ts-ignore - WASM module is generated at build time
    import(/* webpackIgnore: true */ './pcap-wasm/pkg/pcap_wasm.js').then(async (mod) => {
      await mod.default();
      setParser(() => mod.parse_pcap);
    });
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !parser) return;
    if (file.size > MAX_SIZE) {
      setError('File too large');
      return;
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    try {
      const result = parser(buffer);
      setFlows(result.flows);
      setProtocols(result.protocols);
      setError('');
    } catch (err) {
      setError('Failed to parse');
    }
  };

  const filtered = flows.filter((f) => f.flow.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-2 text-white bg-ub-cool-grey h-full overflow-auto text-xs">
      <input type="file" accept=".pcap" onChange={handleFile} disabled={!parser} className="mb-2" />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <input
        type="text"
        placeholder="Filter flows"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-2 w-full text-black px-1"
      />
      <div className="mb-2">
        {Object.entries(protocols).map(([p, c]) => (
          <span key={p} className="mr-2">{p}: {c}</span>
        ))}
      </div>
      <ul>
        {filtered.map((f, i) => (
          <li key={i} className="mb-1">
            {f.flow} ({f.start} - {f.end})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PcapViewer;
