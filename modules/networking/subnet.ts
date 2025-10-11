export interface HostRange {
  firstHost: string | null;
  lastHost: string | null;
}

export interface CidrParseResult {
  /** Parsed prefix length or `null` when validation fails. */
  prefix: number | null;
  /** Indicates whether the prefix originated from a raw number or a dotted mask. */
  source: 'prefix' | 'mask' | null;
  /** Human-readable validation feedback for UI layers. */
  error: string | null;
}

export interface CidrPreset {
  prefix: number;
  mask: string;
  totalAddresses: number;
  usableHosts: number;
  summary: string;
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

const maskToPrefix = (mask: number): number => {
  let prefix = 0;
  let encounteredZero = false;

  for (let bit = IPV4_BIT_LENGTH - 1; bit >= 0; bit -= 1) {
    const isOne = (mask & (1 << bit)) !== 0;
    if (isOne) {
      if (encounteredZero) {
        throw new Error('Subnet mask must use contiguous 1 bits (e.g., 255.255.255.0).');
      }
      prefix += 1;
    } else {
      encounteredZero = true;
    }
  }

  return prefix;
};

const SUBNET_MASK_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export const validateIPv4Address = (address: string): string | null => {
  const trimmed = address.trim();

  if (!trimmed) {
    return 'Enter an IPv4 address to analyze.';
  }

  try {
    parseIPv4(trimmed);
    return null;
  } catch {
    return 'IPv4 address must contain four octets between 0 and 255.';
  }
};

export const parseCidrInput = (input: string): CidrParseResult => {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      prefix: null,
      source: null,
      error: 'Enter a CIDR prefix (0-32) or subnet mask (e.g., 255.255.255.0).',
    };
  }

  let normalized = trimmed;
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  if (/^\d+$/.test(normalized)) {
    const parsed = Number(normalized);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > IPV4_BIT_LENGTH) {
      return {
        prefix: null,
        source: 'prefix',
        error: 'CIDR prefix must be a whole number between 0 and 32.',
      };
    }

    return {
      prefix: parsed,
      source: 'prefix',
      error: null,
    };
  }

  if (SUBNET_MASK_REGEX.test(normalized)) {
    try {
      const maskValue = parseIPv4(normalized);
      const prefix = validateCidr(maskToPrefix(maskValue));

      return {
        prefix,
        source: 'mask',
        error: null,
      };
    } catch (error) {
      let message = 'Subnet mask must use contiguous 1 bits (e.g., 255.255.255.0).';
      if (error instanceof Error) {
        message = error.message === 'Invalid IPv4 address'
          ? 'Subnet mask must contain four octets between 0 and 255.'
          : error.message;
      }

      return {
        prefix: null,
        source: 'mask',
        error: message,
      };
    }
  }

  return {
    prefix: null,
    source: null,
    error: 'Enter a CIDR prefix (0-32) or subnet mask (e.g., 255.255.255.0).',
  };
};

export const prefixToMask = (cidr: number): string => {
  const prefix = validateCidr(cidr);
  return toIPv4(getMask(prefix));
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

export const COMMON_CIDR_PRESETS: CidrPreset[] = [8, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((prefix) => {
  const usableHosts = getUsableHostCount(prefix);
  const totalAddresses = 2 ** (IPV4_BIT_LENGTH - prefix);
  const mask = prefixToMask(prefix);
  const summary = `/${prefix} • ${mask} • ${totalAddresses} addresses`;

  return {
    prefix,
    mask,
    totalAddresses,
    usableHosts,
    summary,
  };
});

export const calculateSubnetInfo = (ip: string, cidr: number) => {
  const prefix = validateCidr(cidr);
  const network = getNetworkAddress(ip, prefix);
  const broadcast = getBroadcastAddress(ip, prefix);
  const hostRange = getHostRange(ip, prefix);
  const usableHosts = getUsableHostCount(prefix);
  const mask = prefixToMask(prefix);

  return {
    network,
    broadcast,
    hostRange,
    usableHosts,
    cidr: prefix,
    mask,
  };
};
