'use client';

import React, { useState } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';

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

// Parse PCAP-NG Enhanced Packet Blocks only
const parsePcapNg = (buf: ArrayBuffer): Packet[] => {
  const view = new DataView(buf);
  let offset = 0;
  const packets: Packet[] = [];
  while (offset + 8 <= view.byteLength) {
    const blockType = view.getUint32(offset, true);
    const blockLen = view.getUint32(offset + 4, true);
    if (blockType === 0x00000006) {
      const tsHigh = view.getUint32(offset + 12, true);
      const tsLow = view.getUint32(offset + 16, true);
      const capLen = view.getUint32(offset + 20, true);
      const dataStart = offset + 28;
      const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
      const meta: any = parseEthernetIpv4(data);
      const timestamp = `${(tsHigh * 2 ** 32 + tsLow) / 1e6}`;
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

const PcapViewer: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

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
          <input
            type="text"
            placeholder="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-black p-1 rounded"
          />
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
                        selected === i ? 'bg-gray-700' : ''
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

