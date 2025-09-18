'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { protocolName } from '../../../components/apps/wireshark/utils';
import FilterHelper from './FilterHelper';
import presets from '../filters/presets.json';
import LayerView from './LayerView';


interface PcapViewerProps {
  showLegend?: boolean;
  initialPackets?: Packet[];
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

interface StreamInfo {
  id: string;
  canonicalA: StreamEndpoint;
  canonicalB: StreamEndpoint;
  direction: 'forward' | 'reverse';
}

const extractTcpPayload = (data: Uint8Array): Uint8Array | undefined => {
  const ethernetHeader = 14;
  if (data.length <= ethernetHeader) return undefined;
  const ipHeaderLength = (data[ethernetHeader] & 0x0f) * 4;
  const tcpHeaderOffset = ethernetHeader + ipHeaderLength;
  if (tcpHeaderOffset + 13 >= data.length) return undefined;
  const tcpHeaderLength = ((data[tcpHeaderOffset + 12] >> 4) & 0xf) * 4;
  if (tcpHeaderLength <= 0) return undefined;
  const payloadStart = tcpHeaderOffset + tcpHeaderLength;
  if (payloadStart >= data.length) return undefined;
  return data.slice(payloadStart);
};

const ipToNumber = (ip: string) =>
  ip
    .split('.')
    .map((part) => Number(part) & 0xff)
    .reduce((acc, part) => (acc << 8) + (Number.isNaN(part) ? 0 : part), 0);

const buildStreamKey = (packet: Packet): StreamInfo | null => {
  if (packet.protocol !== 6 || packet.sport == null || packet.dport == null)
    return null;
  const srcEndpoint: StreamEndpoint = { ip: packet.src, port: packet.sport };
  const destEndpoint: StreamEndpoint = { ip: packet.dest, port: packet.dport };
  const ordered = [srcEndpoint, destEndpoint].sort((a, b) => {
    const diffIp = ipToNumber(a.ip) - ipToNumber(b.ip);
    if (diffIp !== 0) return diffIp;
    return a.port - b.port;
  });
  const [canonicalA, canonicalB] = ordered;
  const direction =
    canonicalA.ip === srcEndpoint.ip && canonicalA.port === srcEndpoint.port
      ? 'forward'
      : 'reverse';
  const id = `6:${canonicalA.ip}:${canonicalA.port}-${canonicalB.ip}:${canonicalB.port}`;
  return { id, canonicalA, canonicalB, direction };
};

const toPrintablePayload = (payload: Uint8Array): string => {
  let text = '';
  for (let i = 0; i < payload.length; i += 1) {
    const byte = payload[i];
    if (byte === 10) text += '\n';
    else if (byte === 13) text += '\r';
    else if (byte === 9) text += '\t';
    else if (byte >= 32 && byte <= 126) text += String.fromCharCode(byte);
    else text += '.';
  }
  return text;
};

const formatStreamTranscript = (stream: StreamData): string => {
  if (!stream.messages.length) {
    return `Stream ${stream.id} has no payload.`;
  }
  return stream.messages
    .map((message) => {
      const from =
        message.direction === 'forward'
          ? stream.endpoints.a
          : stream.endpoints.b;
      const to =
        message.direction === 'forward'
          ? stream.endpoints.b
          : stream.endpoints.a;
      return `[${message.timestamp}] ${from.ip}:${from.port} → ${to.ip}:${to.port}\n${message.payload}`;
    })
    .join('\n\n');
};

const processPackets = (
  input: Packet[]
): { processed: ProcessedPacket[]; streams: Record<string, StreamData> } => {
  const streamMap: Record<string, StreamData> = {};
  const processed = input.map((pkt, index) => {
    const payloadBytes =
      pkt.protocol === 6
        ? pkt.payload ?? extractTcpPayload(pkt.data)
        : undefined;
    const processedPacket: ProcessedPacket = {
      ...pkt,
      payload: payloadBytes,
    };
    const streamInfo = buildStreamKey(processedPacket);
    if (streamInfo) {
      processedPacket.streamKey = streamInfo.id;
      if (!streamMap[streamInfo.id]) {
        streamMap[streamInfo.id] = {
          id: streamInfo.id,
          protocol: pkt.protocol,
          endpoints: {
            a: streamInfo.canonicalA,
            b: streamInfo.canonicalB,
          },
          messages: [],
        };
      }
      const stream = streamMap[streamInfo.id];
      if (payloadBytes && payloadBytes.length > 0) {
        const text = toPrintablePayload(payloadBytes);
        if (text) {
          const last = stream.messages[stream.messages.length - 1];
          if (last && last.direction === streamInfo.direction) {
            last.payload += text;
          } else {
            stream.messages.push({
              direction: streamInfo.direction,
              payload: text,
              timestamp: pkt.timestamp,
              index,
            });
          }
        }
      }
    }
    return processedPacket;
  });
  Object.values(streamMap).forEach((stream) => {
    stream.messages.sort((a, b) => a.index - b.index);
  });
  return { processed, streams: streamMap };
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
  payload?: Uint8Array;
}

interface Layer {
  name: string;
  fields: Record<string, string>;
}

interface ProcessedPacket extends Packet {
  streamKey?: string;
}

interface StreamEndpoint {
  ip: string;
  port: number;
}

interface StreamMessage {
  direction: 'forward' | 'reverse';
  payload: string;
  timestamp: string;
  index: number;
}

interface StreamData {
  id: string;
  protocol: number;
  endpoints: {
    a: StreamEndpoint;
    b: StreamEndpoint;
  };
  messages: StreamMessage[];
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
    const payload = extractTcpPayload(data);
    return { src, dest, protocol, info, sport, dport, payload };
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
      payload: meta.payload,
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
        payload: meta.payload,
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

const decodePacketLayers = (pkt: Packet): Layer[] => {
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

const PcapViewer: React.FC<PcapViewerProps> = ({
  showLegend = true,
  initialPackets,
}) => {
  const [packets, setPackets] = useState<ProcessedPacket[]>([]);
  const [streams, setStreams] = useState<Record<string, StreamData>>({});
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const cancelScheduledLoading = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function' &&
      frameRef.current !== null
    ) {
      window.cancelAnimationFrame(frameRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    frameRef.current = null;
    timeoutRef.current = null;
  }, []);

  const closeStream = useCallback(() => {
    cancelScheduledLoading();
    setStreamLoading(false);
    setActiveStreamId(null);
  }, [cancelScheduledLoading]);

  const finalizeLoading = useCallback(() => {
    cancelScheduledLoading();
    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      frameRef.current = window.requestAnimationFrame(() => {
        setStreamLoading(false);
        frameRef.current = null;
      });
    } else {
      timeoutRef.current = setTimeout(() => {
        setStreamLoading(false);
        timeoutRef.current = null;
      }, 50);
    }
  }, [cancelScheduledLoading]);

  const openStream = useCallback(
    (streamId: string) => {
      if (!streams[streamId]) return;
      setStreamLoading(true);
      setActiveStreamId(streamId);
      finalizeLoading();
    },
    [streams, finalizeLoading]
  );

  const applyPackets = useCallback(
    (pkts: Packet[]) => {
      const { processed, streams: computedStreams } = processPackets(pkts);
      setPackets(processed);
      setStreams(computedStreams);
      setSelected(null);
      closeStream();
    },
    [closeStream]
  );

  useEffect(() => {
    if (initialPackets === undefined) return;
    if (initialPackets.length) {
      applyPackets(initialPackets);
    } else {
      setPackets([]);
      setStreams({});
      setSelected(null);
      closeStream();
    }
  }, [initialPackets, applyPackets, closeStream]);

  useEffect(() => cancelScheduledLoading, [cancelScheduledLoading]);

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

  useEffect(() => {
    if (activeStreamId && !streams[activeStreamId]) {
      closeStream();
    }
  }, [activeStreamId, streams, closeStream]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    applyPackets(pkts);
  };

  const handleSample = async (path: string) => {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    applyPackets(pkts);
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
    if (selected !== null && (selected < 0 || selected >= filtered.length)) {
      setSelected(null);
      closeStream();
    }
  }, [filtered.length, selected, closeStream]);

  const selectedPacket = selected !== null ? filtered[selected] ?? null : null;
  const activeStream = activeStreamId ? streams[activeStreamId] : null;
  const canFollow = Boolean(
    selectedPacket && selectedPacket.protocol === 6 && selectedPacket.streamKey
  );
  const followActive = Boolean(
    canFollow && activeStreamId === selectedPacket?.streamKey
  );
  const exportDisabled =
    !activeStream || !activeStream.messages.length || streamLoading;

  const handleRowSelect = (pkt: ProcessedPacket, index: number) => {
    setSelected(index);
    if (pkt.protocol === 6 && pkt.streamKey) {
      openStream(pkt.streamKey);
    } else {
      closeStream();
    }
  };

  const handleFollowClick = () => {
    if (selectedPacket?.streamKey) {
      openStream(selectedPacket.streamKey);
    }
  };

  const handleExport = () => {
    if (exportDisabled || !activeStream) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function')
      return;
    const text = formatStreamTranscript(activeStream);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stream-${activeStream.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
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
                      key={`${pkt.timestamp}-${i}`}
                      className={`cursor-pointer hover:bg-gray-700 ${
                        selected === i
                          ? 'outline outline-2 outline-white'
                          : protocolColors[
                              protocolName(pkt.protocol).toString()
                            ] || ''
                      }`}
                      onClick={() => handleRowSelect(pkt, i)}
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
            <div className="flex flex-col flex-1 bg-black text-xs font-mono">
              <div className="flex items-center justify-between px-2 py-2 border-b border-gray-800">
                <span className="uppercase tracking-wide text-gray-300 text-[11px]">
                  Packet details
                </span>
                <button
                  type="button"
                  onClick={handleFollowClick}
                  disabled={!canFollow}
                  className={`px-2 py-1 rounded text-[11px] ${
                    canFollow
                      ? 'bg-indigo-700 hover:bg-indigo-600'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-pressed={followActive}
                >
                  {followActive ? 'Following stream' : 'Follow stream'}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {selectedPacket ? (
                  <>
                    {decodePacketLayers(selectedPacket).map((layer, i) => (
                      <LayerView key={i} name={layer.name} fields={layer.fields} />
                    ))}
                    <pre className="text-green-400">{toHex(selectedPacket.data)}</pre>
                  </>
                ) : (
                  'Select a packet'
                )}
              </div>
            </div>
            {activeStream && (
              <aside
                className="w-80 md:w-96 flex-shrink-0 bg-gray-900 border-l border-gray-700 flex flex-col p-2 text-xs font-mono space-y-2"
                aria-label="Stream conversation"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Follow stream</div>
                    <div className="text-[11px] text-gray-300">
                      {protocolName(activeStream.protocol)} ·{' '}
                      {activeStream.endpoints.a.ip}:{activeStream.endpoints.a.port} ↔{' '}
                      {activeStream.endpoints.b.ip}:{activeStream.endpoints.b.port}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exportDisabled}
                      className={`px-2 py-1 rounded ${
                        !exportDisabled
                          ? 'bg-blue-700 hover:bg-blue-600'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Export text
                    </button>
                    <button
                      type="button"
                      onClick={closeStream}
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div
                  className="flex-1 overflow-auto space-y-2"
                  aria-busy={streamLoading}
                >
                  {streamLoading ? (
                    <div className="text-gray-400">Loading stream…</div>
                  ) : activeStream.messages.length ? (
                    activeStream.messages.map((message, idx) => {
                      const from =
                        message.direction === 'forward'
                          ? activeStream.endpoints.a
                          : activeStream.endpoints.b;
                      const to =
                        message.direction === 'forward'
                          ? activeStream.endpoints.b
                          : activeStream.endpoints.a;
                      return (
                        <div
                          key={`${message.index}-${idx}`}
                          data-testid="stream-message"
                          className={`p-2 rounded border ${
                            message.direction === 'forward'
                              ? 'border-blue-700 bg-blue-950/60'
                              : 'border-pink-700 bg-pink-950/60'
                          }`}
                        >
                          <div className="text-[10px] uppercase text-gray-300 tracking-wide">
                            [{message.timestamp}] {from.ip}:{from.port} → {to.ip}:{to.port}
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-[12px]">
                            {message.payload}
                          </pre>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-400">
                      No payload captured for this stream.
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PcapViewer;

