export type VpnProfileType = 'openvpn' | 'wireguard';

export interface OpenVpnConfig {
  type: 'openvpn';
  remote?: string;
  port?: number;
  protocol?: string;
  auth?: string;
  cipher?: string;
  options: Record<string, string | string[]>;
  blocks: Record<string, string>;
}

export interface WireGuardPeer {
  publicKey?: string;
  presharedKey?: string;
  endpoint?: string;
  allowedIps: string[];
  persistentKeepalive?: number | null;
  notes?: string;
  settings: Record<string, string[]>;
}

export interface WireGuardConfig {
  type: 'wireguard';
  interface: Record<string, string[]>;
  peers: WireGuardPeer[];
}

export type ParsedVpnProfile = OpenVpnConfig | WireGuardConfig;

const trimQuotes = (value: string): string => {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const mergeOption = (
  map: Record<string, string | string[]>,
  key: string,
  value: string,
): void => {
  const existing = map[key];
  if (typeof existing === 'undefined') {
    map[key] = value;
  } else if (Array.isArray(existing)) {
    existing.push(value);
    map[key] = existing;
  } else {
    map[key] = [existing, value];
  }
};

export const parseOpenVpnConfig = (content: string): OpenVpnConfig => {
  const options: Record<string, string | string[]> = {};
  const blocks: Record<string, string> = {};
  let remote: string | undefined;
  let port: number | undefined;
  let protocol: string | undefined;
  let auth: string | undefined;
  let cipher: string | undefined;

  const lines = content.replace(/\r/g, '').split('\n');
  let activeBlock: string | null = null;
  let blockBuffer: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const blockStart = line.match(/^<(\w+)>$/);
    const blockEnd = line.match(/^<\/(\w+)>$/);

    if (blockStart) {
      activeBlock = blockStart[1];
      blockBuffer = [];
      continue;
    }
    if (blockEnd && activeBlock === blockEnd[1]) {
      blocks[activeBlock] = blockBuffer.join('\n').trim();
      activeBlock = null;
      blockBuffer = [];
      continue;
    }

    if (activeBlock) {
      blockBuffer.push(rawLine);
      continue;
    }

    const parts = line.split(/\s+/);
    const key = parts[0];
    const value = parts.slice(1).join(' ').trim();

    if (!key) continue;

    switch (key.toLowerCase()) {
      case 'remote': {
        if (parts.length >= 2) {
          remote = parts[1];
        }
        if (parts.length >= 3) {
          const parsedPort = Number.parseInt(parts[2], 10);
          if (!Number.isNaN(parsedPort)) {
            port = parsedPort;
          }
        }
        break;
      }
      case 'port': {
        const parsedPort = Number.parseInt(value, 10);
        if (!Number.isNaN(parsedPort)) {
          port = parsedPort;
        }
        break;
      }
      case 'proto':
      case 'protocol':
        protocol = value.toLowerCase();
        break;
      case 'auth-user-pass':
        auth = value || 'username/password';
        break;
      case 'cipher':
        cipher = value;
        break;
      default:
        break;
    }

    if (value) {
      mergeOption(options, key, value);
    } else {
      mergeOption(options, key, '');
    }
  }

  return {
    type: 'openvpn',
    remote,
    port,
    protocol,
    auth,
    cipher,
    options,
    blocks,
  };
};

const parseValueList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => trimQuotes(item))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const parseWireGuardConfig = (content: string): WireGuardConfig => {
  const interfaceSection: Record<string, string[]> = {};
  const peers: WireGuardPeer[] = [];

  let currentSection: 'interface' | 'peer' | null = null;
  let activePeer: WireGuardPeer | null = null;

  const lines = content.replace(/\r/g, '').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toLowerCase();
      if (sectionName === 'interface') {
        currentSection = 'interface';
        activePeer = null;
      } else if (sectionName === 'peer') {
        currentSection = 'peer';
        activePeer = {
          allowedIps: [],
          settings: {},
        };
        peers.push(activePeer);
      } else {
        currentSection = null;
        activePeer = null;
      }
      continue;
    }

    const [rawKey, ...rawValueParts] = line.split('=');
    if (!rawKey) continue;
    const key = rawKey.trim();
    const rawValue = rawValueParts.join('=').trim();
    const values = parseValueList(rawValue);

    if (currentSection === 'interface') {
      interfaceSection[key] = values;
      continue;
    }

    if (currentSection === 'peer' && activePeer) {
      activePeer.settings[key] = values;
      const lowerKey = key.toLowerCase();
      switch (lowerKey) {
        case 'publickey':
          [activePeer.publicKey] = values;
          break;
        case 'presharedkey':
          [activePeer.presharedKey] = values;
          break;
        case 'endpoint':
          [activePeer.endpoint] = values;
          break;
        case 'allowedips':
          activePeer.allowedIps = values;
          break;
        case 'persistentkeepalive': {
          const parsed = Number.parseInt(values[0] ?? '', 10);
          activePeer.persistentKeepalive = Number.isNaN(parsed) ? null : parsed;
          break;
        }
        case 'description':
        case 'remark':
        case 'comment':
          activePeer.notes = values.join(', ');
          break;
        default:
          break;
      }
    }
  }

  return {
    type: 'wireguard',
    interface: interfaceSection,
    peers,
  };
};

export const detectProfileType = (fileName: string, content: string): VpnProfileType => {
  if (/\.ovpn$/i.test(fileName)) return 'openvpn';
  if (/\.conf$/i.test(fileName)) return 'wireguard';

  if (content.includes('[Interface]') || content.includes('[Peer]')) {
    return 'wireguard';
  }
  return 'openvpn';
};

export const parseVpnProfile = (fileName: string, content: string): ParsedVpnProfile => {
  const type = detectProfileType(fileName, content);
  if (type === 'wireguard') {
    return parseWireGuardConfig(content);
  }
  return parseOpenVpnConfig(content);
};
