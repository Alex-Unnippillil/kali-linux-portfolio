'use client';

import React, { useState, useEffect } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';
import FilterHelper from './FilterHelper';

interface PcapViewerProps {
  showLegend?: boolean;
}

const protocolColors: Record<string, string> = {
  TCP: 'bg-blue-900',
  UDP: 'bg-green-900',
  ICMP: 'bg-yellow-800',
};

// Convert bytes to hex dump string
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

interface Packet {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
}

// Basic Ethernet + IPv4 parser
const parseEthernetIpv4 = (data: Uint8Array) => {
  if (data.length < 34) return { src: '', dest: '', protocol: 0, info: '' };
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) return { src: '', dest: '', protocol: 0, info: '' };
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
const parsePcap = (buf: ArrayBuffer): Packet[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little: boolean;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else throw new Error('Unsupported pcap format');
  let offset = 24;
  const packets: Packet[] = [];
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsUsec = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
    const meta: any = parseEthernetIpv4(data);
    packets.push({
      timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      info: meta.info || `len=${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
    });
    offset += capLen;
  }
  return packets;
};

// Parse PCAP-NG files including section and interface blocks
const parsePcapNg = (buf: ArrayBuffer): Packet[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const ifaces: { tsres: number }[] = [];
  const packets: Packet[] = [];

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
      const dataStart = offset + 28;
      const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
      const meta: any = parseEthernetIpv4(data);
      const res = ifaces[ifaceId]?.tsres ?? 1e-6;
      const timestamp = ((tsHigh * 2 ** 32 + tsLow) * res).toFixed(6);
      packets.push({
        timestamp,
        src: meta.src,
        dest: meta.dest,
        protocol: meta.protocol,
        info: meta.info || `len=${capLen}`,
        sport: meta.sport,
        dport: meta.dport,
        data,
      });
    }

    offset += blockLen;
  }

  return packets;
};

const parseWithWasm = async (buf: ArrayBuffer): Promise<Packet[]> => {
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

const PcapViewer: React.FC<PcapViewerProps> = ({ showLegend = true }) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

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

  const filtered = packets.filter((p) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      p.src.toLowerCase().includes(term) ||
      p.dest.toLowerCase().includes(term) ||
      protocolName(p.protocol).toLowerCase().includes(term) ||
      (p.info || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col space-y-2">
      <input
        type="file"
        accept=".pcap,.pcapng"
        onChange={handleFile}
        className="text-sm"
      />
      {packets.length > 0 && (
        <>
          <FilterHelper value={filter} onChange={setFilter} />
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
            <div className="overflow-auto flex-1">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-1 text-left">Time</th>
                    <th className="px-1 text-left">Source</th>
                    <th className="px-1 text-left">Destination</th>
                    <th className="px-1 text-left">Protocol</th>
                    <th className="px-1 text-left">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pkt, i) => (
                    <tr
                      key={i}
                      className={`cursor-pointer hover:bg-gray-700 ${
                        selected === i
                          ? 'bg-gray-700'
                          : protocolColors[
                              protocolName(pkt.protocol).toString()
                            ] || ''
                      }`}
                      onClick={() => setSelected(i)}
                    >
                      <td className="px-1 whitespace-nowrap">{pkt.timestamp}</td>
                      <td className="px-1">{pkt.src}</td>
                      <td className="px-1">{pkt.dest}</td>
                      <td className="px-1">{protocolName(pkt.protocol)}</td>
                      <td className="px-1">{pkt.info}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="flex-1 bg-black text-green-400 overflow-auto p-2 text-xs">
              {selected !== null ? toHex(filtered[selected].data) : 'Select a packet'}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};

export default PcapViewer;

