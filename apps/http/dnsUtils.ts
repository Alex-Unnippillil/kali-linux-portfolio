export type DnsLookupRequest = {
  id: number;
  host: string;
};

export type DnsLookupSuccess = {
  id: number;
  type: 'success';
  host: string;
  address: string;
};

export type DnsLookupFailure = {
  id: number;
  type: 'error';
  host: string;
  error: string;
};

export type DnsLookupResponse = DnsLookupSuccess | DnsLookupFailure;

const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

const HOST_LABEL_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

export function validateHostname(host: string): string | null {
  const trimmed = host.trim();

  if (!trimmed) {
    return 'Hostname is required.';
  }

  if (trimmed.length > 253) {
    return 'Hostname is too long (253 characters maximum).';
  }

  if (trimmed === 'localhost') {
    return null;
  }

  if (IPV4_REGEX.test(trimmed)) {
    const parts = trimmed.split('.').map(Number);
    if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return 'Invalid IPv4 address: octets must be between 0 and 255.';
    }

    return null;
  }

  if (trimmed.includes(':')) {
    return 'IPv6 lookup is not supported in this demo.';
  }

  const labels = trimmed.split('.');
  if (labels.length < 2) {
    return 'Hostname must include a domain suffix (e.g., example.com).';
  }

  for (const label of labels) {
    if (!label) {
      return 'Hostname contains empty labels (consecutive dots are not allowed).';
    }

    if (!HOST_LABEL_REGEX.test(label)) {
      return `Invalid hostname label: "${label}".`;
    }
  }

  return null;
}

function hashHostname(host: string): number {
  let hash = 0;
  for (let i = 0; i < host.length; i += 1) {
    hash = (hash * 31 + host.charCodeAt(i)) % 2048;
  }
  return hash;
}

export async function simulateDnsLookup(host: string): Promise<string> {
  const normalized = host.trim().toLowerCase();
  const validationError = validateHostname(normalized);

  if (validationError) {
    throw new Error(validationError);
  }

  if (normalized === 'localhost') {
    return '127.0.0.1';
  }

  if (IPV4_REGEX.test(normalized)) {
    return normalized;
  }

  const hash = hashHostname(normalized);
  const lastOctet = (hash % 254) + 1;

  // Use TEST-NET-1 range (192.0.2.0/24) reserved for documentation and examples.
  const address = `192.0.2.${lastOctet}`;

  return address;
}
