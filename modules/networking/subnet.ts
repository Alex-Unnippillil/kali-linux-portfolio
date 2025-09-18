const TOTAL_HEXTETS = 8;
const HEX_DIGITS_PER_HEXTET = 4;
const INTERFACE_IDENTIFIER_BITS = 64;
const HEXTET_BIT_WIDTH = 16n;
const NIBBLE_SIZE = 4;
const INTERFACE_MASK = (1n << BigInt(INTERFACE_IDENTIFIER_BITS)) - 1n;

export type NibbleMatrix = string[][];

export interface IdentifierBreakdown {
  value: string;
  hextets: string[];
  nibbleMatrix: NibbleMatrix;
  binaryGroups: string[];
}

const HEX_PATTERN = /^[0-9a-fA-F]{1,4}$/;
const MAC_SANITIZE = /[^0-9a-fA-F]/g;

function ipv4SegmentToHextets(segment: string): string[] {
  const octets = segment.split('.');
  if (octets.length !== 4) {
    throw new Error('Invalid embedded IPv4 address in IPv6 literal.');
  }
  const bytes = octets.map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('Invalid IPv4 octet inside IPv6 address.');
    }
    return value;
  });
  const high = ((bytes[0] << 8) | bytes[1]).toString(16).padStart(HEX_DIGITS_PER_HEXTET, '0');
  const low = ((bytes[2] << 8) | bytes[3]).toString(16).padStart(HEX_DIGITS_PER_HEXTET, '0');
  return [high.toUpperCase(), low.toUpperCase()];
}

function sanitizeHextet(segment: string): string {
  if (!segment) return '0000';
  if (!HEX_PATTERN.test(segment)) {
    throw new Error(`Invalid hextet segment "${segment}".`);
  }
  return segment.toUpperCase().padStart(HEX_DIGITS_PER_HEXTET, '0');
}

export function expandIpv6(address: string): string[] {
  if (!address) {
    throw new Error('IPv6 address is required.');
  }

  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error('IPv6 address is required.');
  }

  const zoneStripped = trimmed.split('%')[0];
  const [addrPart] = zoneStripped.split('/');
  const lowercase = addrPart.toLowerCase();
  const doubleColonParts = lowercase.split('::');

  if (doubleColonParts.length > 2) {
    throw new Error('IPv6 address may contain at most one double colon.');
  }

  const headSegments = doubleColonParts[0]
    .split(':')
    .filter(Boolean)
    .flatMap((segment) => (segment.includes('.') ? ipv4SegmentToHextets(segment) : [segment]));

  const tailSegments = (doubleColonParts[1] ?? '')
    .split(':')
    .filter(Boolean)
    .flatMap((segment) => (segment.includes('.') ? ipv4SegmentToHextets(segment) : [segment]));

  const missing = TOTAL_HEXTETS - (headSegments.length + tailSegments.length);
  if (doubleColonParts.length === 1 && missing !== 0) {
    throw new Error('IPv6 address has incorrect number of hextets.');
  }
  if (missing < 0) {
    throw new Error('IPv6 address has too many hextets.');
  }

  const hextets = [
    ...headSegments.map(sanitizeHextet),
    ...Array(Math.max(missing, 0)).fill('0000'),
    ...tailSegments.map(sanitizeHextet),
  ];

  if (hextets.length !== TOTAL_HEXTETS) {
    throw new Error('Expanded IPv6 address must contain eight hextets.');
  }

  return hextets;
}

function hextetsToBigInt(hextets: string[]): bigint {
  return hextets.reduce((acc, segment) => {
    const value = BigInt(`0x${segment}`);
    return (acc << HEXTET_BIT_WIDTH) | value;
  }, 0n);
}

function bigIntToHextets(value: bigint, groups: number): string[] {
  const mask = 0xffffn;
  const hextets = new Array<string>(groups);
  let working = value;
  for (let index = groups - 1; index >= 0; index -= 1) {
    const segment = Number(working & mask);
    hextets[index] = segment.toString(16).toUpperCase().padStart(HEX_DIGITS_PER_HEXTET, '0');
    working >>= HEXTET_BIT_WIDTH;
  }
  return hextets;
}

export function nibbleMatrixFromHextets(hextets: string[]): NibbleMatrix {
  return hextets.map((segment) => segment.toUpperCase().padStart(HEX_DIGITS_PER_HEXTET, '0').split(''));
}

function binaryNibbleGroups(value: bigint, width: number): string[] {
  const binary = value.toString(2).padStart(width, '0');
  const groups: string[] = [];
  for (let index = 0; index < binary.length; index += NIBBLE_SIZE) {
    groups.push(binary.slice(index, index + NIBBLE_SIZE));
  }
  return groups;
}

export function ipv6NibbleMatrix(address: string): NibbleMatrix {
  return nibbleMatrixFromHextets(expandIpv6(address));
}

export function interfaceIdentifierFromIpv6(address: string): IdentifierBreakdown {
  const hextets = expandIpv6(address);
  const numeric = hextetsToBigInt(hextets);
  const identifier = numeric & INTERFACE_MASK;
  const identifierHextets = bigIntToHextets(identifier, 4);
  const value = identifierHextets.join(':');

  return {
    value,
    hextets: identifierHextets,
    nibbleMatrix: nibbleMatrixFromHextets(identifierHextets),
    binaryGroups: binaryNibbleGroups(identifier, INTERFACE_IDENTIFIER_BITS),
  };
}

export function macToEui64(mac: string): IdentifierBreakdown {
  if (!mac) {
    throw new Error('MAC address is required.');
  }

  const sanitized = mac.replace(MAC_SANITIZE, '').toLowerCase();
  if (sanitized.length !== 12) {
    throw new Error('MAC address must contain exactly 12 hexadecimal characters.');
  }

  const macValue = BigInt(`0x${sanitized}`);
  const upper24 = macValue >> 24n;
  const lower24 = macValue & ((1n << 24n) - 1n);

  const firstOctet = Number((upper24 >> 16n) & 0xffn) ^ 0x02;
  const secondOctet = Number((upper24 >> 8n) & 0xffn);
  const thirdOctet = Number(upper24 & 0xffn);

  const flippedUpper =
    (BigInt(firstOctet) << 16n) | (BigInt(secondOctet) << 8n) | BigInt(thirdOctet);

  const eui64 = (flippedUpper << 40n) | (0xfffen << 24n) | lower24;
  const hextets = bigIntToHextets(eui64, 4);
  const value = hextets.join(':');

  return {
    value,
    hextets,
    nibbleMatrix: nibbleMatrixFromHextets(hextets),
    binaryGroups: binaryNibbleGroups(eui64, INTERFACE_IDENTIFIER_BITS),
  };
}
