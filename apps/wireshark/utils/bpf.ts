import { protocolName } from '../../../components/apps/wireshark/utils.js';
import { ParsedPacket, PacketPredicate } from '../types';

type Direction = 'src' | 'dst' | 'any';

const protoMap: Record<string, number> = {
  tcp: 6,
  udp: 17,
  icmp: 1,
};

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');

const normalize = (value: string) => stripQuotes(value.trim().toLowerCase());

const asPort = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 65535
    ? parsed
    : null;
};

const matchesProtocol = (packet: ParsedPacket, proto: string) => {
  const code = protoMap[proto];
  if (typeof code !== 'number') return false;
  return packet.protocol === code;
};

const matchesHost = (
  packet: ParsedPacket,
  host: string,
  direction: Direction
) => {
  const cmp = normalize(host);
  const src = packet.src?.toLowerCase?.() ?? '';
  const dest = packet.dest?.toLowerCase?.() ?? '';
  if (direction === 'src') return src === cmp;
  if (direction === 'dst') return dest === cmp;
  return src === cmp || dest === cmp;
};

const matchesPort = (
  packet: ParsedPacket,
  port: number,
  direction: Direction
) => {
  if (direction === 'src') return packet.sport === port;
  if (direction === 'dst') return packet.dport === port;
  return packet.sport === port || packet.dport === port;
};

const buildSubstringPredicate = (term: string): PacketPredicate => {
  const lowered = term.toLowerCase();
  return (packet) => {
    const combined = [
      packet.index.toString(),
      packet.timestamp,
      packet.src,
      packet.dest,
      protocolName(packet.protocol).toString(),
      packet.length.toString(),
      packet.info ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return combined.includes(lowered);
  };
};

const clauseToPredicate = (clause: string): PacketPredicate => {
  const trimmed = clause.trim();
  if (!trimmed) {
    return () => true;
  }
  const lowered = trimmed.toLowerCase();

  if (protoMap[lowered] !== undefined) {
    return (packet) => matchesProtocol(packet, lowered);
  }

  const protoPort = lowered.match(/^(tcp|udp)\s+port\s+(\d+)$/);
  if (protoPort) {
    const port = asPort(protoPort[2]);
    if (port !== null) {
      const proto = protoPort[1];
      return (packet) =>
        matchesProtocol(packet, proto) && matchesPort(packet, port, 'any');
    }
  }

  const directionalHost = lowered.match(
    /^(?:(src|dst)\s+)?host\s+(\S+)$/
  );
  if (directionalHost) {
    const [, dir, host] = directionalHost;
    return (packet) => matchesHost(packet, host, (dir as Direction) ?? 'any');
  }

  const directionalPort = lowered.match(
    /^(?:(src|dst)\s+)?port\s+(\d+)$/
  );
  if (directionalPort) {
    const [, dir, portRaw] = directionalPort;
    const port = asPort(portRaw);
    if (port !== null) {
      return (packet) => matchesPort(packet, port, (dir as Direction) ?? 'any');
    }
  }

  const tcpUdpPortEquality = lowered.match(
    /^(tcp|udp)\.port\s*==\s*(\d+)$/
  );
  if (tcpUdpPortEquality) {
    const [, proto, portRaw] = tcpUdpPortEquality;
    const port = asPort(portRaw);
    if (port !== null) {
      return (packet) =>
        matchesProtocol(packet, proto) && matchesPort(packet, port, 'any');
    }
  }

  const ipEquality = lowered.match(/^(?:ip\.addr|host)\s*==\s*(\S+)$/);
  if (ipEquality) {
    const host = ipEquality[1];
    return (packet) => matchesHost(packet, host, 'any');
  }

  const directionalIpEquality = lowered.match(
    /^(src|dst)\s+ip\.addr\s*==\s*(\S+)$/
  );
  if (directionalIpEquality) {
    const [, dir, host] = directionalIpEquality;
    return (packet) => matchesHost(packet, host, dir as Direction);
  }

  const nakedIp = lowered.match(/^(\d+\.\d+\.\d+\.\d+)$/);
  if (nakedIp) {
    return (packet) => matchesHost(packet, nakedIp[1], 'any');
  }

  const tlsLike = lowered.match(/^(tls|ssl)$/);
  if (tlsLike) {
    const keyword = tlsLike[1];
    return (packet) => (packet.info || '').toLowerCase().includes(keyword);
  }

  const portOnly = lowered.match(/^\d{1,5}$/);
  if (portOnly) {
    const port = asPort(portOnly[0]);
    if (port !== null) {
      return (packet) => matchesPort(packet, port, 'any');
    }
  }

  return buildSubstringPredicate(trimmed);
};

const splitOnOperators = (expression: string, operator: RegExp) =>
  expression
    .split(operator)
    .map((part) => part.trim())
    .filter(Boolean);

export const createBpfPredicate = (
  expression: string
): PacketPredicate => {
  const trimmed = expression.trim();
  if (!trimmed) {
    return () => true;
  }

  const orParts = splitOnOperators(trimmed, /\s*(?:\|\||\bor\b)\s*/i);
  const clauses = orParts.length > 0 ? orParts : [trimmed];

  const clausePredicates = clauses.map((clause) => {
    const andParts = splitOnOperators(clause, /\s*(?:&&|\band\b)\s*/i);
    const predicates = andParts.map((part) => clauseToPredicate(part));
    return (packet: ParsedPacket) => predicates.every((fn) => fn(packet));
  });

  return (packet) => clausePredicates.some((predicate) => predicate(packet));
};

export const filterPackets = <T extends ParsedPacket>(
  packets: T[],
  expression: string
) => {
  const predicate = createBpfPredicate(expression);
  return expression.trim() ? packets.filter(predicate) : packets;
};

