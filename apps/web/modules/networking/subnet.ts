export interface HostRange {
  firstHost: string | null;
  lastHost: string | null;
}

const IPV4_OCTET_COUNT = 4;
const IPV4_BIT_LENGTH = 32;

const parseIPv4 = (address: string): number => {
  if (typeof address !== 'string') {
    throw new Error('Invalid IPv4 address');
  }

  const parts = address.trim().split('.');
  if (parts.length !== IPV4_OCTET_COUNT) {
    throw new Error('Invalid IPv4 address');
  }

  return parts.reduce((acc, part) => {
    if (part.trim() === '') {
      throw new Error('Invalid IPv4 address');
    }

    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('Invalid IPv4 address');
    }

    return ((acc << 8) | value) >>> 0;
  }, 0);
};

const validateCidr = (cidr: number): number => {
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > IPV4_BIT_LENGTH) {
    throw new Error('Invalid CIDR prefix');
  }

  return cidr;
};

const toIPv4 = (value: number): string =>
  [24, 16, 8, 0].map((shift) => ((value >>> shift) & 0xff).toString()).join('.');

const getMask = (cidr: number): number => {
  if (cidr === 0) {
    return 0;
  }

  return (-1 << (IPV4_BIT_LENGTH - cidr)) >>> 0;
};

const getBounds = (ip: string, cidr: number) => {
  const prefix = validateCidr(cidr);
  const address = parseIPv4(ip);
  const mask = getMask(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return { network, broadcast };
};

export const getNetworkAddress = (ip: string, cidr: number): string => {
  const { network } = getBounds(ip, cidr);
  return toIPv4(network);
};

export const getBroadcastAddress = (ip: string, cidr: number): string => {
  const { broadcast } = getBounds(ip, cidr);
  return toIPv4(broadcast);
};

export const getHostRange = (ip: string, cidr: number): HostRange => {
  const prefix = validateCidr(cidr);
  const { network, broadcast } = getBounds(ip, prefix);

  if (prefix >= IPV4_BIT_LENGTH - 1) {
    return { firstHost: null, lastHost: null };
  }

  return {
    firstHost: toIPv4((network + 1) >>> 0),
    lastHost: toIPv4((broadcast - 1) >>> 0),
  };
};

export const getUsableHostCount = (cidr: number): number => {
  const prefix = validateCidr(cidr);
  if (prefix >= IPV4_BIT_LENGTH - 1) {
    return 0;
  }

  const totalHosts = 2 ** (IPV4_BIT_LENGTH - prefix);
  return totalHosts - 2;
};

export const calculateSubnetInfo = (ip: string, cidr: number) => {
  const prefix = validateCidr(cidr);
  const network = getNetworkAddress(ip, prefix);
  const broadcast = getBroadcastAddress(ip, prefix);
  const hostRange = getHostRange(ip, prefix);
  const usableHosts = getUsableHostCount(prefix);

  return {
    network,
    broadcast,
    hostRange,
    usableHosts,
    cidr: prefix,
  };
};
