export interface ResolverResult {
  address: string;
  family?: 4 | 6;
}

export type NiktoResolver = (hostname: string) => Promise<ResolverResult>;

export interface ValidateOptions {
  resolver?: NiktoResolver;
  port?: string;
  allowedSchemes?: string[];
}

export interface NormalizedTarget {
  hostname: string;
  hostLabel: string;
  protocol: string;
  port?: number;
  href: string;
  address: string;
  family?: 4 | 6;
}

export type ValidationResult =
  | { ok: true; normalized: NormalizedTarget }
  | { ok: false; error: string };

const DEFAULT_SCHEMES = ['http:', 'https:'];

const EMPTY_TARGET_ERROR = 'Enter a hostname or URL before running the simulation.';
const WHITESPACE_ERROR = 'Targets cannot contain spaces or newline characters.';
const FILE_URI_ERROR = 'File URIs are not supported. Choose an HTTP or HTTPS target.';
const INVALID_URL_ERROR = 'Enter a valid hostname or URL.';
const PORT_RANGE_ERROR = 'Port must be between 1 and 65535.';
const RESOLUTION_ERROR = 'Unable to resolve host. Check the spelling or try a demo host like example.com.';

const IPV4_SEGMENT = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_REGEX = new RegExp(`^${IPV4_SEGMENT}(\\.${IPV4_SEGMENT}){3}$`);
const IPV6_REGEX = /^[0-9a-f:]+$/i;

const isValidHostname = (hostname: string): boolean => {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  const labels = hostname.split('.');
  return labels.every((label) => {
    if (!label.length || label.length > 63) {
      return false;
    }
    if (!/^[a-z0-9-]+$/i.test(label)) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
    return true;
  });
};

export const mockNiktoResolver: NiktoResolver = async (hostname) => {
  const value = hostname.trim().toLowerCase();

  if (!value) {
    throw new Error('ENOTFOUND');
  }

  if (value === 'localhost') {
    return { address: '127.0.0.1', family: 4 };
  }

  if (IPV4_REGEX.test(value)) {
    return { address: value, family: 4 };
  }

  if (IPV6_REGEX.test(value) && value.includes(':')) {
    return { address: value, family: 6 };
  }

  if (isValidHostname(value)) {
    return { address: '203.0.113.10', family: 4 };
  }

  throw new Error('ENOTFOUND');
};

const normalizeSchemes = (schemes: string[] | undefined): string[] => {
  const list = schemes && schemes.length > 0 ? schemes : DEFAULT_SCHEMES;
  return list.map((scheme) => (scheme.endsWith(':') ? scheme.toLowerCase() : `${scheme.toLowerCase()}:`));
};

export async function validateNiktoTarget(
  target: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const schemes = normalizeSchemes(options.allowedSchemes);
  const trimmed = target.trim();

  if (!trimmed) {
    return { ok: false, error: EMPTY_TARGET_ERROR };
  }

  if (/\s/.test(trimmed)) {
    return { ok: false, error: WHITESPACE_ERROR };
  }

  const hasExplicitScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const fallbackScheme = schemes[0]?.slice(0, -1) || 'http';

  let parsed: URL;
  try {
    parsed = hasExplicitScheme ? new URL(trimmed) : new URL(`${fallbackScheme}://${trimmed}`);
  } catch {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  if (parsed.protocol === 'file:') {
    return { ok: false, error: FILE_URI_ERROR };
  }

  if (!schemes.includes(parsed.protocol)) {
    const humanReadable = schemes
      .map((scheme) => scheme.slice(0, -1).toUpperCase())
      .join(' or ');
    return { ok: false, error: `Only ${humanReadable} targets are supported.` };
  }

  if (!parsed.hostname) {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  const portInput = options.port?.trim() || parsed.port;
  let portNumber: number | undefined;
  if (portInput) {
    if (!/^\d+$/.test(portInput)) {
      return { ok: false, error: PORT_RANGE_ERROR };
    }
    portNumber = Number(portInput);
    if (portNumber < 1 || portNumber > 65535) {
      return { ok: false, error: PORT_RANGE_ERROR };
    }
  }

  const resolver = options.resolver ?? mockNiktoResolver;

  try {
    const resolution = await resolver(parsed.hostname);
    const hostLabel = parsed.hostname.includes(':') ? `[${parsed.hostname}]` : parsed.hostname;
    const portSegment = portNumber ? `:${portNumber}` : '';
    return {
      ok: true,
      normalized: {
        hostname: parsed.hostname,
        hostLabel,
        protocol: parsed.protocol,
        port: portNumber,
        href: `${parsed.protocol}//${hostLabel}${portSegment}`,
        address: resolution.address,
        family: resolution.family,
      },
    };
  } catch {
    return { ok: false, error: RESOLUTION_ERROR };
  }
}

