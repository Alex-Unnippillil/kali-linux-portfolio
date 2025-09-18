export type IPv4Address = `${number}.${number}.${number}.${number}`;

export interface IPv4Cidr {
  network: IPv4Address;
  prefix: number;
}

interface NormalizedSubnet {
  start: number;
  end: number;
  prefix: number;
}

export interface IPv4Subnet {
  cidr: string;
  network: IPv4Address;
  prefix: number;
  broadcast: IPv4Address;
  firstHost: IPv4Address | null;
  lastHost: IPv4Address | null;
  totalAddresses: number;
  usableHosts: number;
}

export interface IPv4AddressRange {
  start: IPv4Address;
  end: IPv4Address;
  size: number;
}

export interface CoverageReport<T extends IPv4Subnet> {
  subnets: T[];
  gaps: IPv4AddressRange[];
  totalAddresses: number;
  isGapFree: boolean;
}

export interface VlsmRequirement {
  hosts: number;
  label?: string;
}

export interface ResolvedVlsmRequirement extends VlsmRequirement {
  originalIndex: number;
}

export interface VlsmAllocation extends IPv4Subnet {
  requirement: ResolvedVlsmRequirement;
  wastedAddresses: number;
}

export interface VlsmPlan extends CoverageReport<VlsmAllocation> {
  base: IPv4Subnet;
  unallocated: ResolvedVlsmRequirement[];
}

const MAX_IPV4 = 2 ** 32 - 1;

function validatePrefix(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Prefix length must be an integer between 0 and 32.');
  }
  return prefix;
}

export function ipv4ToNumber(address: string): number {
  const parts = address.trim().split('.');
  if (parts.length !== 4) {
    throw new Error('IPv4 address must contain four octets.');
  }

  let value = 0;
  for (const part of parts) {
    if (part === '') {
      throw new Error('IPv4 octets cannot be empty.');
    }
    if (!/^\d+$/.test(part)) {
      throw new Error('IPv4 octets must be numeric.');
    }
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new Error('IPv4 octets must be in the range 0-255.');
    }
    value = value * 256 + octet;
  }
  return value;
}

export function numberToIpv4(value: number): IPv4Address {
  if (!Number.isInteger(value) || value < 0 || value > MAX_IPV4) {
    throw new Error('IPv4 numeric value must be between 0 and 2^32 - 1.');
  }

  const octets = [
    Math.floor(value / 16777216) % 256,
    Math.floor(value / 65536) % 256,
    Math.floor(value / 256) % 256,
    value % 256,
  ];
  return `${octets[0]}.${octets[1]}.${octets[2]}.${octets[3]}` as IPv4Address;
}

function subnetSize(prefix: number): number {
  validatePrefix(prefix);
  if (prefix === 32) return 1;
  return 2 ** (32 - prefix);
}

function normalizeCidr({ network, prefix }: IPv4Cidr): NormalizedSubnet {
  const validPrefix = validatePrefix(prefix);
  const address = ipv4ToNumber(network);
  const size = subnetSize(validPrefix);
  const start = address - (address % size);
  const end = start + size - 1;
  return { start, end, prefix: validPrefix };
}

function largestAlignedBlock(start: number): number {
  let block = 1;
  while (block < 2 ** 32 && start % (block * 2) === 0) {
    block *= 2;
  }
  return block;
}

function rangeToCidrs(start: number, end: number): Array<{ start: number; prefix: number }> {
  const ranges: Array<{ start: number; prefix: number }> = [];
  let current = start;
  while (current <= end) {
    let block = largestAlignedBlock(current);
    const remaining = end - current + 1;
    while (block > remaining) {
      block /= 2;
    }
    const prefix = 32 - Math.floor(Math.log2(block));
    ranges.push({ start: current, prefix });
    current += block;
  }
  return ranges;
}

function createSubnet(start: number, prefix: number): IPv4Subnet {
  const size = subnetSize(prefix);
  const network = numberToIpv4(start);
  const broadcast = numberToIpv4(start + size - 1);

  if (prefix >= 31) {
    return {
      cidr: `${network}/${prefix}`,
      network,
      prefix,
      broadcast,
      firstHost: network,
      lastHost: broadcast,
      totalAddresses: size,
      usableHosts: prefix === 32 ? 1 : 2,
    };
  }

  return {
    cidr: `${network}/${prefix}`,
    network,
    prefix,
    broadcast,
    firstHost: numberToIpv4(start + 1),
    lastHost: numberToIpv4(start + size - 2),
    totalAddresses: size,
    usableHosts: Math.max(size - 2, 0),
  };
}

function mergeRanges(ranges: NormalizedSubnet[]): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => {
    if (a.start === b.start) return a.end - b.end;
    return a.start - b.start;
  });
  const merged: Array<{ start: number; end: number }> = [
    { start: sorted[0].start, end: sorted[0].end },
  ];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end + 1) {
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

function calculateGaps(merged: Array<{ start: number; end: number }>): IPv4AddressRange[] {
  const gaps: IPv4AddressRange[] = [];
  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end + 1;
    const gapEnd = merged[i + 1].start - 1;
    if (gapStart <= gapEnd) {
      gaps.push({
        start: numberToIpv4(gapStart),
        end: numberToIpv4(gapEnd),
        size: gapEnd - gapStart + 1,
      });
    }
  }
  return gaps;
}

export function parseCidr(input: string): IPv4Cidr {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('CIDR notation cannot be empty.');
  }
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    throw new Error('CIDR must include a prefix length, e.g. 192.168.0.0/24.');
  }
  const prefix = Number(parts[1]);
  if (!Number.isInteger(prefix)) {
    throw new Error('Prefix length must be an integer.');
  }
  const address = ipv4ToNumber(parts[0]);
  const size = subnetSize(prefix);
  const networkValue = address - (address % size);
  const network = numberToIpv4(networkValue);
  return { network, prefix };
}

export function formatCidr({ network, prefix }: IPv4Cidr): string {
  return `${network}/${prefix}`;
}

export function summarizeSubnets(cidrs: IPv4Cidr[]): CoverageReport<IPv4Subnet> {
  if (cidrs.length === 0) {
    return { subnets: [], gaps: [], totalAddresses: 0, isGapFree: true };
  }

  const normalized = cidrs.map(normalizeCidr);
  const merged = mergeRanges(normalized);
  const subnets = merged.flatMap((range) =>
    rangeToCidrs(range.start, range.end).map((block) =>
      createSubnet(block.start, block.prefix),
    ),
  );

  const gaps = calculateGaps(merged);
  const totalAddresses = subnets.reduce((sum, subnet) => sum + subnet.totalAddresses, 0);

  return {
    subnets,
    gaps,
    totalAddresses,
    isGapFree: gaps.length === 0,
  };
}

function requirementToPrefix(hosts: number): number {
  if (!Number.isFinite(hosts) || hosts < 0) {
    throw new Error('Host requirements must be zero or a positive number.');
  }
  if (hosts === 0) {
    return 32;
  }
  let needed = hosts + 2;
  if (needed < 2) needed = 2;
  let prefix = 32;
  while (2 ** (32 - prefix) < needed && prefix > 0) {
    prefix -= 1;
  }
  return prefix;
}

export function performVlsm({
  base,
  requirements,
}: {
  base: IPv4Cidr;
  requirements: VlsmRequirement[];
}): VlsmPlan {
  const normalizedBase = normalizeCidr(base);
  const baseSubnet = createSubnet(normalizedBase.start, normalizedBase.prefix);

  const resolvedRequirements: ResolvedVlsmRequirement[] = requirements.map(
    (req, index) => ({
      hosts: req.hosts,
      label: req.label,
      originalIndex: index,
    }),
  );

  const sorted = [...resolvedRequirements].sort((a, b) => {
    if (b.hosts === a.hosts) return a.originalIndex - b.originalIndex;
    return b.hosts - a.hosts;
  });

  const allocations: VlsmAllocation[] = [];
  const unallocated: ResolvedVlsmRequirement[] = [];
  let cursor = normalizedBase.start;

  for (const requirement of sorted) {
    const prefix = requirementToPrefix(requirement.hosts);
    const size = subnetSize(prefix);
    if (cursor + size - 1 > normalizedBase.end) {
      unallocated.push(requirement);
      continue;
    }
    const subnet = createSubnet(cursor, prefix);
    const wasted = Math.max(subnet.usableHosts - requirement.hosts, 0);
    allocations.push({
      ...subnet,
      requirement,
      wastedAddresses: wasted,
    });
    cursor += size;
  }

  allocations.sort(
    (a, b) => ipv4ToNumber(a.network) - ipv4ToNumber(b.network),
  );
  unallocated.sort((a, b) => a.originalIndex - b.originalIndex);

  const totalAddresses = allocations.reduce(
    (sum, subnet) => sum + subnet.totalAddresses,
    0,
  );

  const gaps: IPv4AddressRange[] = [];
  if (cursor <= normalizedBase.end) {
    const gapStart = cursor;
    const gapEnd = normalizedBase.end;
    if (gapStart <= gapEnd) {
      gaps.push({
        start: numberToIpv4(gapStart),
        end: numberToIpv4(gapEnd),
        size: gapEnd - gapStart + 1,
      });
    }
  }

  return {
    base: baseSubnet,
    subnets: allocations,
    gaps,
    totalAddresses,
    unallocated,
    isGapFree: gaps.length === 0 && unallocated.length === 0,
  };
}
