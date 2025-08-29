export const protocolName = (proto) => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return proto;
  }
};

import { colorDefinitions } from './colorDefs';

const colorMap = colorDefinitions.reduce((acc, def) => {
  acc[def.name.toLowerCase()] = def.className;
  return acc;
}, {});

// Basic display filter engine used for both quick searches and colour rules.
// Supports protocol keywords (tcp/udp/icmp), ip.addr == x.x.x.x and
// tcp.port/udp.port == N expressions. Falls back to substring search.
export const matchesDisplayFilter = (packet, filter) => {
  if (!filter) return true;
  const f = filter.trim().toLowerCase();
  if (f === 'tcp') return packet.protocol === 6;
  if (f === 'udp') return packet.protocol === 17;
  if (f === 'icmp') return packet.protocol === 1;

  let m = f.match(/^ip\.addr\s*==\s*(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const ip = m[1];
    return packet.src === ip || packet.dest === ip;
  }
  m = f.match(/^tcp\.port\s*==\s*(\d+)$/);
  if (m) {
    const num = parseInt(m[1], 10);
    return packet.protocol === 6 && (packet.sport === num || packet.dport === num);
  }
  m = f.match(/^udp\.port\s*==\s*(\d+)$/);
  if (m) {
    const num = parseInt(m[1], 10);
    return packet.protocol === 17 && (packet.sport === num || packet.dport === num);
  }

  return (
    packet.src.toLowerCase().includes(f) ||
    packet.dest.toLowerCase().includes(f) ||
    protocolName(packet.protocol).toLowerCase().includes(f) ||
    (packet.info || '').toLowerCase().includes(f) ||
    (packet.decrypted || '').toLowerCase().includes(f)
  );
};

// Determine the colour class for a packet based on user rules
export const getRowColor = (packet, rules) => {
  const rule = rules.find((r) => matchesDisplayFilter(packet, r.expression));
  if (!rule) return '';
  const key = rule.color ? rule.color.toLowerCase() : '';
  return colorMap[key] || rule.color || '';
};
