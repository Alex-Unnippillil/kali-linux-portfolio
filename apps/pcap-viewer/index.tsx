import React, { useEffect, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export type PacketInfo = {
  index: number;
  ts: number;
  proto: string;
  src: string;
  dst: string;
  src_port: number;
  dst_port: number;
  data: Uint8Array;
};

type Summary = {
  protocols: Record<string, number>;
  malformed: number;
};

type Flow = {
  src: string;
  dst: string;
  src_port: number;
  dst_port: number;
  proto: string;
  packetIndices: number[];
  http?: string[];
};

const protocolsList = ['TCP', 'UDP', 'DNS', 'HTTP', 'OTHER'];

const PcapViewer: React.FC = () => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [packets, setPackets] = useState<PacketInfo[]>([]);
  const [summary, setSummary] = useState<Summary>({ protocols: {}, malformed: 0 });
  const [flows, setFlows] = useState<Flow[]>([]);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    TCP: true,
    UDP: true,
    DNS: true,
    HTTP: true,
    OTHER: true,
  });
  const [error, setError] = useState('');
  const [sliceStart, setSliceStart] = useState(0);
  const [sliceEnd, setSliceEnd] = useState(0);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const w = new Worker(new URL('./parserWorker.ts', import.meta.url));
    w.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'summary') {
        setSummary({ protocols: e.data.protocols, malformed: e.data.malformed });
      } else if (type === 'packet') {
        setPackets((prev) => [...prev, ...e.data.packets]);
      } else if (type === 'flows') {
        setFlows(e.data.flows);
      } else if (type === 'error') {
        setError(e.data.error);
      }
    };
    setWorker(w);
    return () => w.terminate();
  }, []);

  useEffect(() => {
    if (packets.length > 0 && timeRange[1] === 0) {
      const times = packets.map((p) => p.ts);
      const min = Math.min(...times);
      const max = Math.max(...times);
      setTimeRange([min, max]);
    }
  }, [packets, timeRange]);

  const processFile = async (file?: File) => {
    if (!file || !worker) return;
    if (file.size > MAX_SIZE) {
      setError('File too large');
      return;
    }
    setPackets([]);
    setSummary({ protocols: {}, malformed: 0 });
    setFlows([]);
    const buffer = new Uint8Array(await file.arrayBuffer());
    worker.postMessage({ type: 'parse', buffer }, { transfer: [buffer.buffer] });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFile(e.target.files?.[0]);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    await processFile(e.dataTransfer.files?.[0]);
  };

  const toggleFilter = (proto: string) => {
    setFilters((f) => ({ ...f, [proto]: !f[proto] }));
  };

  const filteredPackets = useMemo(
    () =>
      packets.filter(
        (p) =>
          filters[p.proto] &&
          p.ts >= timeRange[0] &&
          (timeRange[1] === 0 || p.ts <= timeRange[1])
      ),
    [packets, filters, timeRange]
  );

  const filteredFlows = useMemo(
    () => flows.filter((f) => filters[f.proto]),
    [flows, filters]
  );

  useEffect(() => {
    setSliceStart(0);
    setSliceEnd(filteredPackets.length);
  }, [filteredPackets]);

  const times = useMemo(() => filteredPackets.map((p) => p.ts), [filteredPackets]);
  const histData = useMemo(() => {
    if (times.length === 0) return { labels: [], datasets: [] };
    const min = Math.min(...times);
    const max = Math.max(...times);
    const bins = 20;
    const step = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    times.forEach((t) => {
      const idx = Math.min(Math.floor((t - min) / step), bins - 1);
      counts[idx]++;
    });
    const labels = new Array(bins)
      .fill(0)
      .map((_, i) => ((min + i * step) / 1_000_000).toFixed(2));
    return {
      labels,
      datasets: [
        {
          label: 'Packets',
          data: counts,
          backgroundColor: 'rgba(54,162,235,0.5)',
        },
      ],
    };
  }, [times]);

  const exportSlice = () => {
    const start = Math.max(0, sliceStart);
    const end = Math.min(filteredPackets.length, sliceEnd);
    if (end <= start) return;
    const slice = filteredPackets.slice(start, end);
    const blob = new Blob([JSON.stringify(slice)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="p-2 text-white bg-ub-cool-grey h-full overflow-auto text-xs"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input type="file" accept=".pcap,.pcapng" onChange={handleFile} disabled={!worker} className="mb-2" />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="mb-2">
        {protocolsList.map((p) => (
          <label key={p} className="mr-2">
            <input type="checkbox" checked={filters[p]} onChange={() => toggleFilter(p)} /> {p} ({summary.protocols[p] || 0})
          </label>
        ))}
      </div>
      <div className="mb-2">
        Malformed packets: {summary.malformed}
      </div>
      <div className="mb-2">
        <h3 className="font-bold">Flows</h3>
        <ul>
          {filteredFlows.map((f, idx) => (
            <li key={idx} className="mb-1">
              {f.src}:{f.src_port} ↔ {f.dst}:{f.dst_port} [{f.proto}] ({f.packetIndices.length})
              {f.http &&
                f.http.map((m, i) => (
                  <div key={i} className="ml-2 text-green-400">
                    {m.split('\r\n')[0]}
                  </div>
                ))}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <Bar data={histData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        {timeRange[1] > timeRange[0] && (
          <div className="flex mt-1">
            <input
              type="range"
              min={timeRange[0]}
              max={timeRange[1]}
              value={timeRange[0]}
              onChange={(e) => setTimeRange([Number(e.target.value), timeRange[1]])}
              className="flex-1 mr-1"
            />
            <input
              type="range"
              min={timeRange[0]}
              max={timeRange[1]}
              value={timeRange[1]}
              onChange={(e) => setTimeRange([timeRange[0], Number(e.target.value)])}
              className="flex-1"
            />
          </div>
        )}
      </div>
      <List height={300} itemCount={filteredPackets.length} itemSize={20} width={'100%'} className="border mb-2">
        {({ index, style }) => {
          const p = filteredPackets[index];
          return (
            <div style={style} className="whitespace-nowrap overflow-hidden px-1">
              {`#${p.index} ${p.src}:${p.src_port} -> ${p.dst}:${p.dst_port} [${p.proto}]`}
            </div>
          );
        }}
      </List>
      <div className="flex items-center mb-2">
        <input
          type="number"
          value={sliceStart}
          onChange={(e) => setSliceStart(Number(e.target.value))}
          className="text-black mr-1 px-1 w-20"
        />
        <input
          type="number"
          value={sliceEnd}
          onChange={(e) => setSliceEnd(Number(e.target.value))}
          className="text-black mr-1 px-1 w-20"
        />
        <button onClick={exportSlice} className="px-2 py-1 bg-ub-blue text-white">
          Export Filtered
        </button>
      </div>
    </div>
  );
};

export default PcapViewer;
