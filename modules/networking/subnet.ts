export interface HostRange {
  firstHost: string | null;
  lastHost: string | null;
}

export type AddressClass = 'A' | 'B' | 'C' | 'D' | 'E';

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

const toIPv4Binary = (value: number): string =>
  [24, 16, 8, 0]
    .map((shift) => (((value >>> shift) & 0xff).toString(2).padStart(8, '0')))
    .join('.');

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

export const getSubnetMask = (cidr: number): string => {
  const prefix = validateCidr(cidr);
  return toIPv4(getMask(prefix));
};

export const getWildcardMask = (cidr: number): string => {
  const prefix = validateCidr(cidr);
  const mask = getMask(prefix);
  return toIPv4((~mask) >>> 0);
};

export const getBinaryIPv4 = (ip: string): string => toIPv4Binary(parseIPv4(ip));

export const getAddressClass = (ip: string): AddressClass => {
  const address = parseIPv4(ip);
  const firstOctet = (address >>> 24) & 0xff;

  if (firstOctet <= 127) {
    return 'A';
  }
  if (firstOctet <= 191) {
    return 'B';
  }
  if (firstOctet <= 223) {
    return 'C';
  }
  if (firstOctet <= 239) {
    return 'D';
  }
  return 'E';
};

export const isPrivateIPv4 = (ip: string): boolean => {
  const address = parseIPv4(ip);
  const firstOctet = (address >>> 24) & 0xff;
  const secondOctet = (address >>> 16) & 0xff;

  if (firstOctet === 10) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  return firstOctet === 192 && secondOctet === 168;
};

export const calculateSubnetInfo = (ip: string, cidr: number) => {
  const prefix = validateCidr(cidr);
  const network = getNetworkAddress(ip, prefix);
  const broadcast = getBroadcastAddress(ip, prefix);
  const hostRange = getHostRange(ip, prefix);
  const usableHosts = getUsableHostCount(prefix);
  const subnetMask = getSubnetMask(prefix);
  const wildcardMask = getWildcardMask(prefix);
  const binaryIp = getBinaryIPv4(ip);
  const addressClass = getAddressClass(ip);
  const privateAddress = isPrivateIPv4(ip);

  return {
    network,
    broadcast,
    hostRange,
    usableHosts,
    subnetMask,
    wildcardMask,
    binaryIp,
    addressClass,
    privateAddress,
    cidr: prefix,
  };
};
