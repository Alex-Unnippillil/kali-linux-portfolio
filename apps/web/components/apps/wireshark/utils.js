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

// Cache compiled filter predicates to avoid repeatedly parsing expressions.
const filterCache = new Map();
const rulePredicateCache = new WeakMap();

const compileFilter = (filter) => {
  const f = filter.trim().toLowerCase();
  if (filterCache.has(f)) return filterCache.get(f);

  let predicate;
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

// Basic display filter engine used for both quick searches and colour rules.
// Supports protocol keywords (tcp/udp/icmp), ip.addr == x.x.x.x and
// tcp.port/udp.port == N expressions. Falls back to substring search.
export const matchesDisplayFilter = (packet, filter) => {
  if (!filter) return true;
  const predicate =
    typeof filter === 'function' ? filter : compileFilter(filter);
  return predicate(packet);
};

// Determine the colour class for a packet based on user rules
export const getRowColor = (packet, rules) => {
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
