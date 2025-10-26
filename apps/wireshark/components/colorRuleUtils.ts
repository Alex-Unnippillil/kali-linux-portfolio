import { getRowColor, matchesDisplayFilter } from '../../../components/apps/wireshark/utils';

export interface ColorRule {
  expression: string;
  color: string;
}

export interface PacketLike {
  src: string;
  dest: string;
  protocol: number;
  info?: string;
  sport?: number;
  dport?: number;
  plaintext?: string;
  decrypted?: string;
  [key: string]: unknown;
}

export interface PacketRowMetadata<T extends PacketLike> {
  packet: T;
  matchesFilter: boolean;
  colorClass: string;
}

const toColorRule = (value: unknown): ColorRule => {
  if (typeof value !== 'object' || value === null) {
    return { expression: '', color: '' };
  }
  const record = value as Record<string, unknown>;
  const expression = typeof record.expression === 'string' ? record.expression.trim() : '';
  const color = typeof record.color === 'string' ? record.color.trim() : '';
  return { expression, color };
};

export const isColorRuleArray = (value: unknown): value is ColorRule[] => {
  if (!Array.isArray(value)) return false;
  return value.every((rule) => {
    if (typeof rule !== 'object' || rule === null) return false;
    const record = rule as Record<string, unknown>;
    return typeof record.expression === 'string' && typeof record.color === 'string';
  });
};

export const sanitizeColorRules = (value: ColorRule[]): ColorRule[] =>
  value.map((rule) => ({
    expression: rule.expression?.trim?.() ?? '',
    color: rule.color?.trim?.() ?? '',
  }));

export const parseColorRules = (input: string): ColorRule[] => {
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toColorRule);
  } catch {
    return [];
  }
};

export const serializeColorRules = (rules: ColorRule[]): string =>
  JSON.stringify(sanitizeColorRules(rules), null, 2);

export const buildPacketRowMetadata = <T extends PacketLike>(
  packets: T[],
  filter: string,
  rules: ColorRule[],
): PacketRowMetadata<T>[] =>
  packets.map((packet) => ({
    packet,
    matchesFilter: matchesDisplayFilter(packet, filter),
    colorClass: getRowColor(packet, rules),
  }));
