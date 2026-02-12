'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';
import FilterHelper from './FilterHelper';
import presets from '../filters/presets.json';
import LayerView, { FieldRange, LayerField } from './LayerView';
import HexView from './HexView';


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

type PacketMeta = Pick<Packet, 'src' | 'dest' | 'protocol' | 'info' | 'sport' | 'dport'>;

// Basic Ethernet + IPv4 parser
const parseEthernetIpv4 = (data: Uint8Array): PacketMeta => {
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
    const meta = parseEthernetIpv4(data);
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
      const meta = parseEthernetIpv4(data);
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

const recomputeIpv4Checksum = (buffer: Uint8Array) => {
  if (buffer.length <= 24) return;
  const ipStart = 14;
  if (ipStart >= buffer.length) return;
  const headerWords = buffer[ipStart] & 0x0f;
  const headerLength = headerWords * 4;
  if (headerWords < 5 || ipStart + headerLength > buffer.length) return;

  const checksumOffset = ipStart + 10;
  if (checksumOffset + 1 >= buffer.length) return;

  buffer[checksumOffset] = 0;
  buffer[checksumOffset + 1] = 0;

  let sum = 0;
  for (let i = 0; i < headerLength; i += 2) {
    const high = buffer[ipStart + i];
    const low = buffer[ipStart + i + 1] ?? 0;
    sum += (high << 8) | low;
    while (sum > 0xffff) {
      sum = (sum & 0xffff) + (sum >> 16);
    }
  }

  const checksum = (~sum) & 0xffff;
  buffer[checksumOffset] = (checksum >> 8) & 0xff;
  buffer[checksumOffset + 1] = checksum & 0xff;
};

interface LayerDescriptor {
  name: string;
  fields: LayerField[];
}

const formatMac = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');

const formatIp = (bytes: Uint8Array) => Array.from(bytes).join('.');

const readUint16 = (data: Uint8Array, offset: number) =>
  offset + 1 < data.length ? (data[offset] << 8) | data[offset + 1] : 0;

const readUint32 = (data: Uint8Array, offset: number) => {
  if (offset + 3 >= data.length) return 0;
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0;
};

const decodePacketLayers = (data: Uint8Array): LayerDescriptor[] => {
  const layers: LayerDescriptor[] = [];

  if (data.length >= 14) {
    layers.push({
      name: 'Ethernet',
      fields: [
        {
          label: 'Destination',
          value: formatMac(data.slice(0, 6)),
          start: 0,
          length: 6,
          description: 'Destination MAC address',
        },
        {
          label: 'Source',
          value: formatMac(data.slice(6, 12)),
          start: 6,
          length: 6,
          description: 'Source MAC address',
        },
        {
          label: 'Type',
          value: `0x${readUint16(data, 12).toString(16).padStart(4, '0').toUpperCase()}`,
          start: 12,
          length: 2,
          description: 'EtherType identifying the payload protocol',
        },
      ],
    });
  }

  if (data.length >= 34) {
    const ipStart = 14;
    const version = data[ipStart] >> 4;
    const headerLength = (data[ipStart] & 0x0f) * 4;
    if (version === 4 && headerLength >= 20 && ipStart + headerLength <= data.length) {
      const proto = data[ipStart + 9];
      const checksum = readUint16(data, ipStart + 10);
      const totalLength = readUint16(data, ipStart + 2);
      const ttl = data[ipStart + 8];
      const ipFields: LayerField[] = [
        {
          label: 'Version/IHL',
          value: `v${version}, ${headerLength} bytes`,
          start: ipStart,
          length: 1,
          description: 'Version and Internet Header Length',
        },
        {
          label: 'Total Length',
          value: `${totalLength} bytes`,
          start: ipStart + 2,
          length: 2,
          description: 'Total length of the IPv4 packet',
        },
        {
          label: 'Time To Live',
          value: ttl.toString(),
          start: ipStart + 8,
          length: 1,
          description: 'Hop limit before the packet is discarded',
        },
        {
          label: 'Protocol',
          value: protocolName(proto),
          start: ipStart + 9,
          length: 1,
          description: 'Transport protocol identifier',
        },
        {
          label: 'Header Checksum',
          value: `0x${checksum.toString(16).padStart(4, '0').toUpperCase()}`,
          start: ipStart + 10,
          length: 2,
          description: 'Automatically recomputed after edits',
        },
        {
          label: 'Source',
          value: formatIp(data.slice(ipStart + 12, ipStart + 16)),
          start: ipStart + 12,
          length: 4,
          description: 'Source IPv4 address',
        },
        {
          label: 'Destination',
          value: formatIp(data.slice(ipStart + 16, ipStart + 20)),
          start: ipStart + 16,
          length: 4,
          description: 'Destination IPv4 address',
        },
      ];
      layers.push({ name: 'IPv4', fields: ipFields });

      const transportStart = ipStart + headerLength;
      if (proto === 6 && transportStart + 20 <= data.length) {
        const seq = readUint32(data, transportStart + 4);
        const ack = readUint32(data, transportStart + 8);
        const flags = data[transportStart + 13];
        layers.push({
          name: 'TCP',
          fields: [
            {
              label: 'Source Port',
              value: readUint16(data, transportStart).toString(),
              start: transportStart,
              length: 2,
              description: 'Origin TCP port number',
            },
            {
              label: 'Destination Port',
              value: readUint16(data, transportStart + 2).toString(),
              start: transportStart + 2,
              length: 2,
              description: 'Destination TCP port number',
            },
            {
              label: 'Sequence Number',
              value: seq.toString(),
              start: transportStart + 4,
              length: 4,
              description: 'Sequence number for this segment',
            },
            {
              label: 'Acknowledgment',
              value: ack.toString(),
              start: transportStart + 8,
              length: 4,
              description: 'Acknowledged sequence number',
            },
            {
              label: 'Flags',
              value: `0x${flags.toString(16).padStart(2, '0').toUpperCase()}`,
              start: transportStart + 13,
              length: 1,
              description: 'Control flags (SYN, ACK, FIN, etc.)',
            },
          ],
        });
      } else if (proto === 17 && transportStart + 8 <= data.length) {
        layers.push({
          name: 'UDP',
          fields: [
            {
              label: 'Source Port',
              value: readUint16(data, transportStart).toString(),
              start: transportStart,
              length: 2,
              description: 'Origin UDP port number',
            },
            {
              label: 'Destination Port',
              value: readUint16(data, transportStart + 2).toString(),
              start: transportStart + 2,
              length: 2,
              description: 'Destination UDP port number',
            },
            {
              label: 'Length',
              value: `${readUint16(data, transportStart + 4)} bytes`,
              start: transportStart + 4,
              length: 2,
              description: 'Length of the UDP datagram',
            },
            {
              label: 'Checksum',
              value: `0x${readUint16(data, transportStart + 6)
                .toString(16)
                .padStart(4, '0')
                .toUpperCase()}`,
              start: transportStart + 6,
              length: 2,
              description: 'Checksum over the UDP header and payload',
            },
          ],
        });
      }
    }
  }

  return layers;
};

const PcapViewer: React.FC<PcapViewerProps> = ({ showLegend = true }) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([
    'Time',
    'Source',
    'Destination',
    'Protocol',
    'Info',
  ]);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [sharedBuffer, setSharedBuffer] = useState<Uint8Array | null>(null);
  const [highlight, setHighlight] = useState<FieldRange | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const selectedPacketRef = useRef<Packet | null>(null);
  const layerInstructionsId = useId();

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
    setSharedBuffer(null);
    setHighlight(null);
    setValidationMessage(null);
    selectedPacketRef.current = null;
  };

  const handleSample = async (path: string) => {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    setPackets(pkts);
    setSelected(null);
    setSharedBuffer(null);
    setHighlight(null);
    setValidationMessage(null);
    selectedPacketRef.current = null;
  };

  const filtered = useMemo(() => {
    return packets.filter((p) => {
      if (!filter) return true;
      const term = filter.toLowerCase();
      return (
        p.src.toLowerCase().includes(term) ||
        p.dest.toLowerCase().includes(term) ||
        protocolName(p.protocol).toLowerCase().includes(term) ||
        (p.info || '').toLowerCase().includes(term)
      );
    });
  }, [packets, filter]);

  useEffect(() => {
    if (selected !== null && selected >= filtered.length) {
      setSelected(null);
      setSharedBuffer(null);
      setHighlight(null);
    }
  }, [filtered.length, selected]);

  useEffect(() => {
    const packet =
      selected !== null && selected < filtered.length ? filtered[selected] : null;
    if (!packet) {
      if (sharedBuffer !== null) {
        setSharedBuffer(null);
      }
      setHighlight(null);
      setValidationMessage(null);
      selectedPacketRef.current = null;
      return;
    }
    if (selectedPacketRef.current !== packet) {
      selectedPacketRef.current = packet;
      setSharedBuffer(new Uint8Array(packet.data));
      setHighlight(null);
      setValidationMessage(null);
    }
  }, [filtered, selected, sharedBuffer]);

  const selectedPacket =
    selected !== null && selected < filtered.length ? filtered[selected] : null;
  const layers = sharedBuffer ? decodePacketLayers(sharedBuffer) : [];

  const handleSelectPacket = (index: number) => {
    const packet = filtered[index];
    setSelected(index);
    if (packet) {
      const copy = new Uint8Array(packet.data);
      setSharedBuffer(copy);
      selectedPacketRef.current = packet;
      setHighlight(null);
      setValidationMessage(null);
    }
  };

  const handleBufferUpdate = (next: Uint8Array) => {
    const updated = new Uint8Array(next);
    recomputeIpv4Checksum(updated);
    setSharedBuffer(updated);
    if (selected === null) return;
    const packet = filtered[selected];
    if (!packet) return;
    const meta = parseEthernetIpv4(updated);
    setPackets((prev) => {
      const idx = prev.indexOf(packet);
      if (idx === -1) return prev;
      const nextPackets = [...prev];
      const current = nextPackets[idx];
      const updatedPacket: Packet = {
        ...current,
        data: updated,
        src: meta.src || current.src,
        dest: meta.dest || current.dest,
        protocol: meta.protocol || current.protocol,
        info: meta.info || current.info,
        sport: meta.sport ?? current.sport,
        dport: meta.dport ?? current.dport,
      };
      nextPackets[idx] = updatedPacket;
      selectedPacketRef.current = updatedPacket;
      return nextPackets;
    });
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
            <div className="overflow-auto flex-1">
              <table className="text-xs w-full font-mono">
                <thead>
                  <tr className="bg-gray-800">
                    {columns.map((col) => (
                      <th
                        key={col}
                        draggable
                        onDragStart={() => setDragCol(col)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (!dragCol || dragCol === col) return;
                          const updated = [...columns];
                          const from = updated.indexOf(dragCol);
                          const to = updated.indexOf(col);
                          updated.splice(from, 1);
                          updated.splice(to, 0, dragCol);
                          setColumns(updated);
                        }}
                        className="px-1 text-left cursor-move"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pkt, i) => (
                    <tr
                      key={i}
                      className={`cursor-pointer hover:bg-gray-700 ${
                        selected === i
                          ? 'outline outline-2 outline-white'
                          : protocolColors[
                              protocolName(pkt.protocol).toString()
                            ] || ''
                      }`}
                      onClick={() => handleSelectPacket(i)}
                      aria-selected={selected === i}
                    >
                      {columns.map((col) => {
                        let val = '';
                        switch (col) {
                          case 'Time':
                            val = pkt.timestamp;
                            break;
                          case 'Source':
                            val = pkt.src;
                            break;
                          case 'Destination':
                            val = pkt.dest;
                            break;
                          case 'Protocol':
                            val = protocolName(pkt.protocol);
                            break;
                          case 'Info':
                            val = pkt.info;
                            break;
                        }
                        return (
                          <td key={col} className="px-1 whitespace-nowrap">
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex-1 bg-black overflow-auto p-2 text-xs font-mono space-y-3">
              {selectedPacket && sharedBuffer ? (
                <>
                  <p id={layerInstructionsId} className="sr-only">
                    Use Tab or Shift+Tab to move between fields. Focused rows highlight the
                    corresponding bytes in the hex editor below.
                  </p>
                  {layers.map((layer, index) => (
                    <LayerView
                      key={`${layer.name}-${index}`}
                      name={layer.name}
                      fields={layer.fields}
                      onFocusField={setHighlight}
                      instructionsId={layerInstructionsId}
                    />
                  ))}
                  <HexView
                    buffer={sharedBuffer}
                    highlight={highlight}
                    onChange={handleBufferUpdate}
                    onFocusRange={setHighlight}
                    onValidation={setValidationMessage}
                  />
                </>
              ) : (
                <p className="text-gray-400">Select a packet to inspect its structure</p>
              )}
            </div>
          </div>
        </>
      )}
      <div aria-live="polite" className="sr-only">
        {highlight ? `Highlighting ${highlight.label}` : ''}
      </div>
      <div aria-live="assertive" className="sr-only">
        {validationMessage || ''}
      </div>
    </div>
  );
};

export default PcapViewer;

