import { useMemo, useRef } from 'react';
import { colorDefinitions } from '../colorDefs';

export interface PacketSummary {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
  plaintext?: string;
  decrypted?: string;
}

export type DisplayFilter =
  | string
  | ((packet: PacketSummary) => boolean);

interface ColorRule {
  expression: string;
  color?: string;
}

export type TcpDirection = 'forward' | 'reverse';

export interface TcpStreamParticipant {
  address: string;
  port?: number;
}

export interface TcpStreamMessage {
  packet: PacketSummary;
  payload: string;
  direction: TcpDirection;
  timestamp: string;
  src: string;
  dest: string;
  sport?: number;
  dport?: number;
  index: number;
}

export interface TcpStream {
  key: string;
  participants: [TcpStreamParticipant, TcpStreamParticipant];
  packets: TcpStreamMessage[];
}

export interface UseTcpStreamsResult {
  streams: TcpStream[];
  packetToStream: WeakMap<PacketSummary, TcpStream>;
  packetToMessage: WeakMap<PacketSummary, TcpStreamMessage>;
}

export const protocolName = (proto: number): string => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return proto.toString();
  }
};

const colorMap = colorDefinitions.reduce<Record<string, string>>((acc, def) => {
  acc[def.name.toLowerCase()] = def.className;
  return acc;
}, {});

const filterCache = new Map<string, (packet: PacketSummary) => boolean>();
const rulePredicateCache = new WeakMap<
  ColorRule,
  { expr: string; fn: (packet: PacketSummary) => boolean }
>();

const compileFilter = (
  filter: string
): ((packet: PacketSummary) => boolean) => {
  const f = filter.trim().toLowerCase();
  if (filterCache.has(f)) return filterCache.get(f)!;

  let predicate: (packet: PacketSummary) => boolean;
  if (f === 'tcp') predicate = (p) => p.protocol === 6;
  else if (f === 'udp') predicate = (p) => p.protocol === 17;
  else if (f === 'icmp') predicate = (p) => p.protocol === 1;
  else {
    let m = f.match(/^ip\.addr\s*==\s*(\d+\.\d+\.\d+\.\d+)$/);
    if (m) {
      const ip = m[1];
      predicate = (p) => p.src === ip || p.dest === ip;
    } else if ((m = f.match(/^tcp\.port\s*==\s*(\d+)$/))) {
      const num = parseInt(m[1], 10);
      predicate = (p) => p.protocol === 6 && (p.sport === num || p.dport === num);
    } else if ((m = f.match(/^udp\.port\s*==\s*(\d+)$/))) {
      const num = parseInt(m[1], 10);
      predicate = (p) => p.protocol === 17 && (p.sport === num || p.dport === num);
    } else {
      predicate = (p) =>
        p.src.toLowerCase().includes(f) ||
        p.dest.toLowerCase().includes(f) ||
        protocolName(p.protocol).toLowerCase().includes(f) ||
        (p.info || '').toLowerCase().includes(f) ||
        (p.plaintext || p.decrypted || '').toLowerCase().includes(f);
    }
  }

  filterCache.set(f, predicate);
  return predicate;
};

export const matchesDisplayFilter = (
  packet: PacketSummary,
  filter: DisplayFilter
): boolean => {
  if (!filter) return true;
  const predicate =
    typeof filter === 'function' ? filter : compileFilter(filter);
  return predicate(packet);
};

export const getRowColor = (
  packet: PacketSummary,
  rules: ColorRule[]
): string => {
  const rule = rules.find((r) => {
    const cached = rulePredicateCache.get(r);
    if (!cached || cached.expr !== r.expression) {
      const entry = { expr: r.expression, fn: compileFilter(r.expression) };
      rulePredicateCache.set(r, entry);
      return entry.fn(packet);
    }
    return cached.fn(packet);
  });
  if (!rule) return '';
  const key = rule.color ? rule.color.toLowerCase() : '';
  return colorMap[key] || rule.color || '';
};

const endpointMatches = (
  endpoint: TcpStreamParticipant,
  address: string,
  port?: number
) =>
  endpoint.address === address &&
  (endpoint.port ?? null) === (port ?? null);

const decodeAsciiPayload = (
  packet: PacketSummary,
  cache: WeakMap<PacketSummary, string>
): string => {
  const cached = cache.get(packet);
  if (cached !== undefined) return cached;
  const data = packet.data;
  if (!(data instanceof Uint8Array)) {
    cache.set(packet, '');
    return '';
  }
  if (data.length < 54) {
    cache.set(packet, '');
    return '';
  }
  const ipHeaderOffset = 14;
  if (data.length <= ipHeaderOffset) {
    cache.set(packet, '');
    return '';
  }
  const ipHeaderLength = (data[ipHeaderOffset] & 0x0f) * 4;
  if (!ipHeaderLength || data.length < ipHeaderOffset + ipHeaderLength) {
    cache.set(packet, '');
    return '';
  }
  const tcpOffset = ipHeaderOffset + ipHeaderLength;
  if (data.length <= tcpOffset + 12) {
    cache.set(packet, '');
    return '';
  }
  const tcpHeaderLength = ((data[tcpOffset + 12] >> 4) & 0x0f) * 4;
  if (!tcpHeaderLength) {
    cache.set(packet, '');
    return '';
  }
  const payloadStart = tcpOffset + tcpHeaderLength;
  if (payloadStart >= data.length) {
    cache.set(packet, '');
    return '';
  }
  const payload = data.slice(payloadStart);
  if (!payload.length) {
    cache.set(packet, '');
    return '';
  }
  let ascii = '';
  for (let i = 0; i < payload.length; i += 1) {
    const byte = payload[i];
    if (byte === 0x0a) ascii += '\n';
    else if (byte === 0x0d) ascii += '\r';
    else if (byte >= 0x20 && byte <= 0x7e) ascii += String.fromCharCode(byte);
    else ascii += '.';
  }
  cache.set(packet, ascii);
  return ascii;
};

export const useTcpStreams = (
  packets: PacketSummary[]
): UseTcpStreamsResult => {
  const asciiCacheRef = useRef<WeakMap<PacketSummary, string>>(
    new WeakMap()
  );
  return useMemo(() => {
    const asciiCache = asciiCacheRef.current;
    const streams = new Map<string, TcpStream>();
    const packetStreamMap = new WeakMap<PacketSummary, TcpStream>();
    const packetMessageMap = new WeakMap<PacketSummary, TcpStreamMessage>();

    packets.forEach((packet, index) => {
      if (packet.protocol !== 6) return;
      const srcPort = packet.sport ?? -1;
      const destPort = packet.dport ?? -1;
      const srcId = `${packet.src}:${srcPort}`;
      const destId = `${packet.dest}:${destPort}`;
      const key = srcId < destId ? `${srcId}|${destId}` : `${destId}|${srcId}`;

      let stream = streams.get(key);
      if (!stream) {
        stream = {
          key,
          participants: [
            { address: packet.src, port: packet.sport },
            { address: packet.dest, port: packet.dport },
          ],
          packets: [],
        };
        streams.set(key, stream);
      } else {
        const [first, second] = stream.participants;
        if (
          !endpointMatches(first, packet.src, packet.sport) &&
          !endpointMatches(second, packet.src, packet.sport)
        ) {
          stream.participants[0] = { address: packet.src, port: packet.sport };
        }
        if (
          !endpointMatches(first, packet.dest, packet.dport) &&
          !endpointMatches(second, packet.dest, packet.dport)
        ) {
          stream.participants[1] = { address: packet.dest, port: packet.dport };
        }
      }

      const direction: TcpDirection = endpointMatches(
        stream.participants[0],
        packet.src,
        packet.sport
      )
        ? 'forward'
        : 'reverse';

      const message: TcpStreamMessage = {
        packet,
        payload: decodeAsciiPayload(packet, asciiCache),
        direction,
        timestamp: packet.timestamp,
        src: packet.src,
        dest: packet.dest,
        sport: packet.sport,
        dport: packet.dport,
        index,
      };

      stream.packets.push(message);
      packetStreamMap.set(packet, stream);
      packetMessageMap.set(packet, message);
    });

    const streamList = Array.from(streams.values());
    return {
      streams: streamList,
      packetToStream: packetStreamMap,
      packetToMessage: packetMessageMap,
    };
  }, [packets]);
};
