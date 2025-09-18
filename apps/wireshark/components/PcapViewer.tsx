'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';
import FilterHelper from './FilterHelper';
import presets from '../filters/presets.json';
import LayerView from './LayerView';
import { ParsedPacket } from '../types';
import { createBpfPredicate } from '../utils/bpf';
import { useVirtualRows } from '../utils/virtualization';


interface PcapViewerProps {
  showLegend?: boolean;
}

const protocolColors: Record<string, string> = {
  TCP: 'bg-blue-900',
  UDP: 'bg-green-900',
  ICMP: 'bg-yellow-800',
};

const samples = [
  { label: 'HTTP', path: '/samples/wireshark/http.pcap' },
  { label: 'DNS', path: '/samples/wireshark/dns.pcap' },
];

const DEFAULT_COLUMNS = [
  'No.',
  'Time',
  'Source',
  'Destination',
  'Protocol',
  'Length',
  'Info',
] as const;

const columnSizing: Record<string, string> = {
  'No.': 'minmax(3.5rem, 4rem)',
  Time: 'minmax(7rem, 1.5fr)',
  Source: 'minmax(9rem, 2fr)',
  Destination: 'minmax(9rem, 2fr)',
  Protocol: 'minmax(6rem, 1fr)',
  Length: 'minmax(4rem, 1fr)',
  Info: 'minmax(12rem, 3fr)',
};

const ROW_HEIGHT = 28;

// Convert bytes to hex dump string
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

interface Layer {
  name: string;
  fields: Record<string, string>;
}

interface PacketMetadata {
  src: string;
  dest: string;
  protocol: number;
  info: string;
  sport?: number;
  dport?: number;
}

// Basic Ethernet + IPv4 parser
const parseEthernetIpv4 = (data: Uint8Array): PacketMetadata => {
  if (data.length < 34)
    return { src: '', dest: '', protocol: 0, info: '' };
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800)
    return { src: '', dest: '', protocol: 0, info: '' };
  const protocol = data[23];
  const src = Array.from(data.slice(26, 30)).join('.');
  const dest = Array.from(data.slice(30, 34)).join('.');
  let info = '';
  if (protocol === 6 && data.length >= 54) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `TCP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  if (protocol === 17 && data.length >= 42) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `UDP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  return { src, dest, protocol, info };
};

// Parse classic pcap format
const parsePcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little: boolean;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else throw new Error('Unsupported pcap format');
  let offset = 24;
  const packets: ParsedPacket[] = [];
  let index = 1;
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsUsec = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
    const meta = parseEthernetIpv4(data);
    packets.push({
      index: index++,
      timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      info: meta.info || `len=${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
      length: origLen,
    });
    offset += capLen;
  }
  return packets;
};

// Parse PCAP-NG files including section and interface blocks
const parsePcapNg = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const ifaces: { tsres: number }[] = [];
  const packets: ParsedPacket[] = [];
  let index = 1;

  while (offset + 8 <= view.byteLength) {
    let blockType = view.getUint32(offset, little);
    let blockLen = view.getUint32(offset + 4, little);

    if (blockType === 0x0a0d0d0a) {
      const bom = view.getUint32(offset + 8, true);
      if (bom === 0x1a2b3c4d) little = true;
      else if (bom === 0x4d3c2b1a) little = false;
      blockLen = view.getUint32(offset + 4, little);
    } else if (blockType === 0x00000001) {
      let tsres = 1e-6;
      let optOffset = offset + 20;
      while (optOffset + 4 <= offset + blockLen - 4) {
        const optCode = view.getUint16(optOffset, little);
        const optLen = view.getUint16(optOffset + 2, little);
        optOffset += 4;
        if (optCode === 9 && optLen === 1) {
          const val = view.getUint8(optOffset);
          tsres = val & 0x80 ? 2 ** -(val & 0x7f) : 10 ** -val;
        }
        optOffset += optLen;
        optOffset = (optOffset + 3) & ~3;
        if (optCode === 0) break;
      }
      ifaces.push({ tsres });
    } else if (blockType === 0x00000006) {
      const ifaceId = view.getUint32(offset + 8, little);
      const tsHigh = view.getUint32(offset + 12, little);
      const tsLow = view.getUint32(offset + 16, little);
      const capLen = view.getUint32(offset + 20, little);
      const origLen = view.getUint32(offset + 24, little);
      const dataStart = offset + 28;
      const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
      const meta = parseEthernetIpv4(data);
      const res = ifaces[ifaceId]?.tsres ?? 1e-6;
      const timestamp = ((tsHigh * 2 ** 32 + tsLow) * res).toFixed(6);
      packets.push({
        index: index++,
        timestamp,
        src: meta.src,
        dest: meta.dest,
        protocol: meta.protocol,
        info: meta.info || `len=${capLen}`,
        sport: meta.sport,
        dport: meta.dport,
        data,
        length: origLen || capLen,
      });
    }

    offset += blockLen;
  }

  return packets;
};

const parseWithWasm = async (buf: ArrayBuffer): Promise<ParsedPacket[]> => {
  try {
    // Attempt to load wasm parser; fall back to JS parsing
    await WebAssembly.instantiateStreaming(
      fetch('https://unpkg.com/pcap.js@latest/pcap.wasm'),
      {}
    );
  } catch {
    // Ignore errors and use JS parser
  }
  const magic = new DataView(buf).getUint32(0, false);
  return magic === 0x0a0d0d0a ? parsePcapNg(buf) : parsePcap(buf);
};

const decodePacketLayers = (pkt: ParsedPacket): Layer[] => {
  const data = pkt.data;
  const layers: Layer[] = [];
  if (data.length >= 14) {
    const destMac = Array.from(data.slice(0, 6))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':');
    const srcMac = Array.from(data.slice(6, 12))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':');
    const type = ((data[12] << 8) | data[13]).toString(16).padStart(4, '0');
    layers.push({
      name: 'Ethernet',
      fields: {
        Destination: destMac,
        Source: srcMac,
        Type: `0x${type}`,
      },
    });
  }
  if (data.length >= 34) {
    const srcIp = Array.from(data.slice(26, 30)).join('.');
    const destIp = Array.from(data.slice(30, 34)).join('.');
    const proto = data[23];
    layers.push({
      name: 'IPv4',
      fields: {
        Source: srcIp,
        Destination: destIp,
        Protocol: protocolName(proto),
      },
    });
    if (proto === 6 && data.length >= 54) {
      const sport = (data[34] << 8) | data[35];
      const dport = (data[36] << 8) | data[37];
      layers.push({
        name: 'TCP',
        fields: {
          'Source Port': sport.toString(),
          'Destination Port': dport.toString(),
        },
      });
    } else if (proto === 17 && data.length >= 42) {
      const sport = (data[34] << 8) | data[35];
      const dport = (data[36] << 8) | data[37];
      layers.push({
        name: 'UDP',
        fields: {
          'Source Port': sport.toString(),
          'Destination Port': dport.toString(),
        },
      });
    }
  }
  return layers;
};

const PcapViewer: React.FC<PcapViewerProps> = ({ showLegend = true }) => {
  const [packets, setPackets] = useState<ParsedPacket[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([...DEFAULT_COLUMNS]);
  const [dragCol, setDragCol] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        navigator.clipboard.writeText(filter);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f) setFilter(f);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (filter) url.searchParams.set('filter', filter);
    else url.searchParams.delete('filter');
    window.history.replaceState(null, '', url.toString());
  }, [filter]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    setPackets(pkts);
    setSelected(null);
  };

  const handleSample = async (path: string) => {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    setPackets(pkts);
    setSelected(null);
  };

  const filterPredicate = useMemo(() => createBpfPredicate(filter), [filter]);
  const filtered = useMemo(() => {
    if (!filter.trim()) return packets;
    return packets.filter(filterPredicate);
  }, [packets, filter, filterPredicate]);

  useEffect(() => {
    if (selected !== null && (selected < 0 || selected >= filtered.length)) {
      setSelected(filtered.length ? Math.min(selected, filtered.length - 1) : null);
    }
  }, [filtered.length, selected]);

  const gridTemplate = useMemo(
    () =>
      columns
        .map((col) => columnSizing[col] ?? 'minmax(6rem, 1fr)')
        .join(' '),
    [columns]
  );

  const { containerRef, range } = useVirtualRows({
    itemCount: filtered.length,
    rowHeight: ROW_HEIGHT,
    overscan: 6,
  });

  const visiblePackets = useMemo(
    () => filtered.slice(range.start, range.end),
    [filtered, range.end, range.start]
  );

  const getCellValue = (pkt: ParsedPacket, col: string) => {
    switch (col) {
      case 'No.':
        return pkt.index.toString();
      case 'Time':
        return pkt.timestamp;
      case 'Source':
        return pkt.src;
      case 'Destination':
        return pkt.dest;
      case 'Protocol':
        return String(protocolName(pkt.protocol));
      case 'Length':
        return pkt.length.toString();
      case 'Info':
        return pkt.info || '';
      default:
        return '';
    }
  };

  const getProtocolClass = (pkt: ParsedPacket) => {
    const proto = String(protocolName(pkt.protocol)).toUpperCase();
    return protocolColors[proto] || '';
  };

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".pcap,.pcapng"
          onChange={handleFile}
          className="text-sm"
        />
        <select
          onChange={(e) => {
            if (e.target.value) handleSample(e.target.value);
            e.target.value = '';
          }}
          className="text-sm bg-gray-700 text-white rounded"
        >
          <option value="">Open sample</option>
          {samples.map(({ label, path }) => (
            <option key={path} value={path}>
              {label}
            </option>
          ))}
        </select>
        <a
          href="https://wiki.wireshark.org/SampleCaptures"
          target="_blank"
          rel="noreferrer"
          className="text-xs underline"
        >
          Sample sources
        </a>
      </div>
      {packets.length > 0 && (
        <>
          <div className="flex items-center space-x-2">
            <FilterHelper value={filter} onChange={setFilter} />
            <button
              onClick={() => navigator.clipboard.writeText(filter)}
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              type="button"
              title="Copy display filter (Ctrl+Shift+C)"
            >
              Copy
            </button>
          </div>
          <div className="flex space-x-1">
            {presets.map(({ label, expression }) => (
              <button
                key={expression}
                onClick={() => setFilter(expression)}
                className={`w-4 h-4 rounded ${
                  protocolColors[label.toUpperCase()] || 'bg-gray-500'
                }`}
                title={label}
                type="button"
              />
            ))}
          </div>

          {showLegend && (
            <div className="flex space-x-4 text-xs">
              {Object.entries(protocolColors).map(([proto, color]) => (
                <div key={proto} className="flex items-center space-x-1">
                  <span className={`w-3 h-3 inline-block ${color}`}></span>
                  <span>{proto}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-1 overflow-hidden space-x-2">
            <div
              className="flex-1 flex flex-col overflow-hidden"
              role="table"
              aria-rowcount={filtered.length}
            >
              <div
                className="bg-gray-800 grid text-xs font-semibold uppercase tracking-wide"
                style={{ gridTemplateColumns: gridTemplate }}
                role="row"
              >
                {columns.map((col) => (
                  <div
                    key={col}
                    role="columnheader"
                    draggable
                    onDragStart={() => setDragCol(col)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!dragCol) return;
                      if (dragCol === col) {
                        setDragCol(null);
                        return;
                      }
                      const updated = [...columns];
                      const from = updated.indexOf(dragCol);
                      const to = updated.indexOf(col);
                      if (from === -1 || to === -1) return;
                      updated.splice(from, 1);
                      updated.splice(to, 0, dragCol);
                      setColumns(updated);
                      setDragCol(null);
                    }}
                    onDragEnd={() => setDragCol(null)}
                    className="px-1 py-1 cursor-move select-none"
                  >
                    {col}
                  </div>
                ))}
              </div>
              <div
                ref={containerRef}
                data-testid="pcap-scroll-container"
                className="flex-1 overflow-auto relative border border-gray-800/60 rounded"
                role="rowgroup"
              >
                {filtered.length === 0 ? (
                  <div className="p-4 text-xs text-gray-400">
                    No packets match the current filter.
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${range.totalHeight}px`,
                      position: 'relative',
                      minWidth: '100%',
                    }}
                  >
                    <div
                      style={{
                        transform: `translateY(${range.offset}px)`,
                        willChange: 'transform',
                      }}
                    >
                      {visiblePackets.map((pkt, idx) => {
                        const actualIndex = range.start + idx;
                        const colorClass = getProtocolClass(pkt);
                        const isSelected = selected === actualIndex;
                        return (
                          <div
                            key={pkt.index}
                            role="row"
                            onClick={() => setSelected(actualIndex)}
                            className={`grid items-center gap-x-2 px-1 border-b border-gray-800/40 cursor-pointer text-xs font-mono hover:bg-gray-700/70 ${
                              colorClass
                            } ${
                              isSelected ? 'outline outline-2 outline-white' : ''
                            }`}
                            style={{
                              gridTemplateColumns: gridTemplate,
                              height: `${ROW_HEIGHT}px`,
                            }}
                          >
                            {columns.map((col) => (
                              <div key={col} role="cell" className="px-1 truncate">
                                {getCellValue(pkt, col)}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 bg-black overflow-auto p-2 text-xs font-mono space-y-1 border border-gray-800/60 rounded">
              {selected !== null && filtered[selected] ? (
                <>
                  {decodePacketLayers(filtered[selected]).map((layer, i) => (
                    <LayerView key={i} name={layer.name} fields={layer.fields} />
                  ))}
                  <pre className="text-green-400">{toHex(filtered[selected].data)}</pre>
                </>
              ) : (
                'Select a packet'
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PcapViewer;

