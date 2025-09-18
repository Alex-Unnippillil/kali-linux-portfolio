'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';
import VirtualPacketTable, {
  VirtualPacketRow,
} from '../../../components/apps/wireshark/VirtualPacketTable';
import FilterHelper from './FilterHelper';
import presets from '../filters/presets.json';
import LayerView from './LayerView';
import tinyCapture from '../tinyCapture.json';

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

const columnWidths: Record<string, string> = {
  'No.': '64px',
  Time: '120px',
  Source: 'minmax(140px, 1fr)',
  Destination: 'minmax(140px, 1fr)',
  Protocol: '110px',
  Length: '80px',
  Info: 'minmax(240px, 2fr)',
};

type PacketLayers = Record<string, Record<string, string | number>>;

interface ParsedPacket {
  timestamp: number;
  src: string;
  dest: string;
  protocol: number;
  length: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
  layers?: PacketLayers;
}

interface NormalizedPacket extends VirtualPacketRow {
  timeSeconds: number;
  protocolKey: number;
  raw: ParsedPacket;
}

interface Layer {
  name: string;
  fields: Record<string, string>;
}

interface TinyCaptureEntry {
  timestamp: string;
  src: string;
  dest: string;
  sport?: number;
  dport?: number;
  protocol: number;
  info?: string;
  length?: number;
  layers?: PacketLayers;
}

const toHex = (bytes: Uint8Array = new Uint8Array()) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

const parseEthernetIpv4 = (data: Uint8Array) => {
  if (data.length < 34) {
    return { src: '', dest: '', protocol: 0, info: '' };
  }
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) {
    return { src: '', dest: '', protocol: 0, info: '' };
  }
  const protocol = data[23];
  const src = Array.from(data.slice(26, 30)).join('.');
  const dest = Array.from(data.slice(30, 34)).join('.');
  let info = '';
  let sport: number | undefined;
  let dport: number | undefined;
  if (protocol === 6 && data.length >= 54) {
    sport = (data[34] << 8) | data[35];
    dport = (data[36] << 8) | data[37];
    info = `TCP ${sport} → ${dport}`;
  } else if (protocol === 17 && data.length >= 42) {
    sport = (data[34] << 8) | data[35];
    dport = (data[36] << 8) | data[37];
    info = `UDP ${sport} → ${dport}`;
  }
  return { src, dest, protocol, info, sport, dport };
};

const parsePcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little: boolean;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else throw new Error('Unsupported pcap format');
  let offset = 24;
  const packets: ParsedPacket[] = [];
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
      timestamp: tsSec + tsUsec / 1e6,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      length: origLen,
      info: meta.info || `Frame length: ${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
    });
    offset += capLen;
  }
  return packets;
};

const parsePcapNg = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const ifaces: { tsres: number }[] = [];
  const packets: ParsedPacket[] = [];

  while (offset + 8 <= view.byteLength) {
    const blockType = view.getUint32(offset, little);
    const blockLen = view.getUint32(offset + 4, little);
    if (blockLen <= 0) break;

    if (blockType === 0x0a0d0d0a) {
      const bom = view.getUint32(offset + 8, true);
      if (bom === 0x1a2b3c4d) little = true;
      else if (bom === 0x4d3c2b1a) little = false;
    } else if (blockType === 0x00000001) {
      let tsres = 1e-6;
      let optOffset = offset + 20;
      while (optOffset + 4 <= offset + blockLen - 4) {
        const optCode = view.getUint16(optOffset, little);
        const optLen = view.getUint16(optOffset + 2, little);
        optOffset += 4;
        if (optCode === 9 && optLen > 0) {
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
      const timestamp = (tsHigh * 2 ** 32 + tsLow) * res;
      packets.push({
        timestamp,
        src: meta.src,
        dest: meta.dest,
        protocol: meta.protocol,
        length: origLen,
        info: meta.info || `Frame length: ${origLen}`,
        sport: meta.sport,
        dport: meta.dport,
        data,
      });
    }

    offset += blockLen;
  }

  return packets;
};

const parseCaptureBuffer = async (buf: ArrayBuffer): Promise<ParsedPacket[]> => {
  if (buf.byteLength < 4) return [];
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  if (magic === 0x0a0d0d0a) {
    return parsePcapNg(buf);
  }
  try {
    return parsePcap(buf);
  } catch (err) {
    console.error(err);
    return [];
  }
};

const parseTinyCapture = (entries: TinyCaptureEntry[]): ParsedPacket[] =>
  entries.map((entry, idx) => {
    const numericTs = Number(entry.timestamp);
    const timestamp = Number.isFinite(numericTs) ? numericTs / 1000 : idx;
    return {
      timestamp,
      src: entry.src,
      dest: entry.dest,
      protocol: entry.protocol,
      length: entry.length ?? 0,
      info: entry.info ?? '',
      sport: entry.sport,
      dport: entry.dport,
      data: new Uint8Array(),
      layers: entry.layers,
    };
  });

const buildGridTemplate = (columns: string[]) =>
  columns.map((col) => columnWidths[col] ?? 'minmax(120px, 1fr)').join(' ');

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');

const parseNumeric = (value: string) => {
  const trimmed = value.trim();
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
};

const compareNumber = (actual: number | undefined, expected: number | null, operator: string) => {
  if (actual === undefined || expected === null) return false;
  switch (operator) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>=':
      return actual >= expected;
    case '<=':
      return actual <= expected;
    case '>':
      return actual > expected;
    case '<':
      return actual < expected;
    default:
      return false;
  }
};

const compareString = (actual: string | undefined, expected: string, operator: string) => {
  if (!actual) return false;
  switch (operator) {
    case '==':
      return actual.toLowerCase() === expected.toLowerCase();
    case '!=':
      return actual.toLowerCase() !== expected.toLowerCase();
    default:
      return false;
  }
};

const evaluateFieldTerm = (
  packet: NormalizedPacket,
  field: string,
  operator: string,
  value: string
) => {
  const normalizedField = field.toLowerCase();
  const normalizedValue = stripQuotes(value.trim());
  const expectedNumber = parseNumeric(normalizedValue);
  const { raw } = packet;
  switch (normalizedField) {
    case 'ip.addr':
      return (
        compareString(packet.source, normalizedValue, operator) ||
        compareString(packet.destination, normalizedValue, operator)
      );
    case 'ip.src':
    case 'ip.src_host':
      return compareString(packet.source, normalizedValue, operator);
    case 'ip.dst':
    case 'ip.dst_host':
      return compareString(packet.destination, normalizedValue, operator);
    case 'tcp.port':
    case 'udp.port':
      return (
        compareNumber(raw.sport, expectedNumber, operator) ||
        compareNumber(raw.dport, expectedNumber, operator)
      );
    case 'tcp.srcport':
      return compareNumber(raw.sport, expectedNumber, operator);
    case 'tcp.dstport':
      return compareNumber(raw.dport, expectedNumber, operator);
    case 'udp.srcport':
      return compareNumber(raw.sport, expectedNumber, operator);
    case 'udp.dstport':
      return compareNumber(raw.dport, expectedNumber, operator);
    case 'frame.len':
    case 'frame.length':
    case 'length':
      return compareNumber(packet.length, expectedNumber, operator);
    case 'frame.number':
    case 'no':
      return compareNumber(packet.no, expectedNumber, operator);
    case 'protocol':
      return compareString(packet.protocol, normalizedValue, operator);
    default:
      return false;
  }
};

const evaluateTerm = (packet: NormalizedPacket, term: string) => {
  const trimmed = term.trim();
  if (!trimmed) return true;
  const comparison = trimmed.match(/^(?<field>[a-z0-9_.]+)\s*(?<op>==|!=|>=|<=|>|<)\s*(?<value>.+)$/i);
  if (comparison?.groups) {
    const { field, op, value } = comparison.groups;
    return evaluateFieldTerm(packet, field, op, value);
  }
  const lower = trimmed.toLowerCase();
  switch (lower) {
    case 'tcp':
      return packet.protocol.toLowerCase() === 'tcp';
    case 'udp':
      return packet.protocol.toLowerCase() === 'udp';
    case 'icmp':
      return packet.protocol.toLowerCase() === 'icmp';
    case 'arp':
      return packet.protocol.toLowerCase() === 'arp';
    default: {
      const target = lower.replace(/[()]/g, '');
      return (
        packet.protocol.toLowerCase().includes(target) ||
        packet.info.toLowerCase().includes(target) ||
        packet.source.toLowerCase().includes(target) ||
        packet.destination.toLowerCase().includes(target) ||
        packet.length.toString() === target ||
        packet.no.toString() === target
      );
    }
  }
};

const createFilterPredicate = (expression: string) => {
  const trimmed = expression.trim();
  if (!trimmed) {
    return (packet: NormalizedPacket) => Boolean(packet);
  }
  const sanitized = trimmed.replace(/[()]/g, ' ');
  const orGroups = sanitized
    .split(/\s*(?:\|\||\bor\b)\s*/i)
    .map((group) => group.trim())
    .filter(Boolean);

  return (packet: NormalizedPacket) => {
    if (orGroups.length === 0) {
      return evaluateTerm(packet, sanitized);
    }
    return orGroups.some((group) => {
      const andTerms = group
        .split(/\s*(?:&&|\band\b)\s*/i)
        .map((t) => t.trim())
        .filter(Boolean);
      return andTerms.every((term) => evaluateTerm(packet, term));
    });
  };
};

const decodePacketLayers = (pkt: ParsedPacket): Layer[] => {
  if (pkt.layers) {
    return Object.entries(pkt.layers).map(([name, fields]) => ({
      name: name.toUpperCase(),
      fields: Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, String(value)])
      ),
    }));
  }

  const data = pkt.data ?? new Uint8Array();
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
  const [rawPackets, setRawPackets] = useState<ParsedPacket[]>(() =>
    parseTinyCapture(tinyCapture as TinyCaptureEntry[])
  );
  const [filter, setFilter] = useState('');
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([
    'No.',
    'Time',
    'Source',
    'Destination',
    'Protocol',
    'Length',
    'Info',
  ]);
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

  const normalizedPackets = useMemo<NormalizedPacket[]>(() => {
    if (rawPackets.length === 0) return [];
    const baseTimestamp = rawPackets[0]?.timestamp ?? 0;
    return rawPackets.map((pkt, idx) => {
      const timeSeconds = pkt.timestamp - baseTimestamp;
      const protocolStr = protocolName(pkt.protocol) || `0x${pkt.protocol.toString(16)}`;
      return {
        no: idx + 1,
        timeSeconds,
        timeDisplay: Number.isFinite(timeSeconds)
          ? timeSeconds.toFixed(6)
          : pkt.timestamp.toFixed(6),
        source: pkt.src || '',
        destination: pkt.dest || '',
        protocol: protocolStr,
        length: pkt.length,
        info: pkt.info || '',
        protocolKey: pkt.protocol,
        raw: pkt,
      };
    });
  }, [rawPackets]);

  const filterPredicate = useMemo(() => createFilterPredicate(filter), [filter]);

  const filteredPackets = useMemo(
    () => normalizedPackets.filter((pkt) => filterPredicate(pkt)),
    [normalizedPackets, filterPredicate]
  );

  useEffect(() => {
    if (selectedNo === null) return;
    const stillExists = filteredPackets.some((pkt) => pkt.no === selectedNo);
    if (!stillExists) {
      setSelectedNo(null);
    }
  }, [filteredPackets, selectedNo]);

  const selectedPacket = useMemo(
    () => filteredPackets.find((pkt) => pkt.no === selectedNo) ?? null,
    [filteredPackets, selectedNo]
  );

  const gridTemplateColumns = useMemo(
    () => buildGridTemplate(columns),
    [columns]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const pkts = await parseCaptureBuffer(buf);
    setRawPackets(
      pkts.length > 0 ? pkts : parseTinyCapture(tinyCapture as TinyCaptureEntry[])
    );
    setSelectedNo(null);
  };

  const handleSample = async (path: string) => {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const pkts = await parseCaptureBuffer(buf);
    setRawPackets(
      pkts.length > 0 ? pkts : parseTinyCapture(tinyCapture as TinyCaptureEntry[])
    );
    setSelectedNo(null);
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
      {rawPackets.length > 0 && (
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <div
                className="grid text-xs font-mono bg-gray-800 border-b border-gray-700"
                style={{ gridTemplateColumns }}
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
                      if (!dragCol || dragCol === col) return;
                      const updated = [...columns];
                      const from = updated.indexOf(dragCol);
                      const to = updated.indexOf(col);
                      updated.splice(from, 1);
                      updated.splice(to, 0, dragCol);
                      setColumns(updated);
                    }}
                    className="px-2 py-1 text-left cursor-move select-none"
                    title="Drag to reorder column"
                  >
                    {col}
                  </div>
                ))}
              </div>
              <VirtualPacketTable
                columns={columns}
                rows={filteredPackets}
                selectedNo={selectedNo}
                gridTemplateColumns={gridTemplateColumns}
                onSelect={(row) => setSelectedNo(row.no)}
                getRowClassName={(row, isSelected) => {
                  const base =
                    'grid text-xs font-mono px-1 py-1 border-b border-gray-800 hover:bg-gray-700 cursor-pointer';
                  const accent = protocolColors[row.protocol.toUpperCase()] || '';
                  const outline = isSelected ? 'outline outline-2 outline-white' : '';
                  return [base, accent, outline].filter(Boolean).join(' ');
                }}
              />
            </div>
            <div className="flex-1 bg-black overflow-auto p-2 text-xs font-mono space-y-1">
              {selectedPacket ? (
                <>
                  {decodePacketLayers(selectedPacket.raw).map((layer, i) => (
                    <LayerView key={i} name={layer.name} fields={layer.fields} />
                  ))}
                  <pre className="text-green-400">
                    {toHex(selectedPacket.raw.data)}
                  </pre>
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
