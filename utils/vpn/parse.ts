import { ParsedVpnProfile, VpnProfileType, WireGuardFormValues, OpenVpnFormValues, NetworkManagerConnection } from "./types";

const DEFAULT_AUTOCONNECT = false;

function generateProfileId(prefix: VpnProfileType): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  try {
    const { randomUUID } = require("node:crypto");
    return `${prefix}-${randomUUID()}`;
  } catch {
    return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

type IniSection = Record<string, string>;

type IniResult = Record<string, IniSection[]>;

function parseIni(input: string): IniResult {
  const result: IniResult = {};
  let currentSection: IniSection | null = null;

  const ensureSection = (name: string) => {
    const key = name.toLowerCase();
    if (!result[key]) {
      result[key] = [];
    }
    currentSection = {};
    result[key].push(currentSection);
  };

  const lines = input.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      ensureSection(line.slice(1, -1));
      continue;
    }
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    if (!currentSection) {
      // lines before any section are ignored
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    currentSection[key] = value;
  }
  return result;
}

function parseCsvList(value?: string): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseAddressList(value?: string): Array<{ address: string; prefix?: number }> | undefined {
  if (!value) return undefined;
  const addresses: Array<{ address: string; prefix?: number }> = [];
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [addr, prefixStr] = trimmed.split("/");
    const prefix = prefixStr ? Number(prefixStr) : undefined;
    addresses.push({ address: addr, prefix: Number.isFinite(prefix) ? prefix : undefined });
  }
  return addresses.length ? addresses : undefined;
}

function normaliseName(rawName?: string, fallback = "VPN Profile"): string {
  if (!rawName) return fallback;
  return rawName.trim() || fallback;
}

function buildWireGuardConfig(values: WireGuardFormValues): string {
  const lines: string[] = ["[Interface]"];
  lines.push(`Address = ${values.address}`);
  lines.push(`PrivateKey = ${values.privateKey}`);
  if (values.dns) lines.push(`DNS = ${values.dns}`);
  if (values.listenPort) lines.push(`ListenPort = ${values.listenPort}`);
  lines.push("", "[Peer]");
  lines.push(`PublicKey = ${values.peerPublicKey}`);
  if (values.peerEndpoint) lines.push(`Endpoint = ${values.peerEndpoint}`);
  lines.push(`AllowedIPs = ${values.peerAllowedIps}`);
  if (values.peerPresharedKey) lines.push(`PresharedKey = ${values.peerPresharedKey}`);
  if (values.persistentKeepalive) lines.push(`PersistentKeepalive = ${values.persistentKeepalive}`);
  return lines.join("\n");
}

function parseWireGuardFromIni(config: string, explicitName?: string): ParsedVpnProfile {
  const sections = parseIni(config);
  const iface = sections["interface"]?.[0];
  if (!iface) {
    throw new Error("WireGuard config missing [Interface] section");
  }
  const peers = sections["peer"] ?? [];
  if (!peers.length) {
    throw new Error("WireGuard config requires at least one [Peer] section");
  }
  const privateKey = iface["privatekey"];
  if (!privateKey) {
    throw new Error("WireGuard interface missing PrivateKey");
  }
  const address = iface["address"];
  const dnsList = parseCsvList(iface["dns"]);
  const listenPort = iface["listenport"] ? Number(iface["listenport"]) : undefined;
  const mtu = iface["mtu"] ? Number(iface["mtu"]) : undefined;
  const fwmark = iface["fwmark"] ? Number(iface["fwmark"]) : undefined;
  const profileName = normaliseName(explicitName ?? iface["name"], "WireGuard connection");

  const peerRoutes = iface["peerroutes"] ? iface["peerroutes"].toLowerCase() !== "false" : true;

  const nmConnection: NetworkManagerConnection = {
    connection: {
      id: profileName,
      type: "wireguard",
      autoconnect: DEFAULT_AUTOCONNECT,
    },
    wireguard: {
      private_key: "ask",
      listen_port: listenPort,
      fwmark,
      peer_routes: peerRoutes,
      mtu,
    },
    wireguard_peer: peers.map((peer) => {
      const allowed = parseCsvList(peer["allowedips"]);
      const persistentKeepalive = peer["persistentkeepalive"]
        ? Number(peer["persistentkeepalive"])
        : undefined;
      return {
        public_key: peer["publickey"] ?? "",
        endpoint: peer["endpoint"],
        allowed_ips: allowed,
        preshared_key: peer["presharedkey"],
        persistent_keepalive: persistentKeepalive,
      };
    }),
    ipv4: {
      method: address ? "manual" : "auto",
      address_data: parseAddressList(address),
      dns: dnsList,
    },
    ipv6: {
      method: "auto",
    },
    secrets: {
      "wireguard.private-key": privateKey,
      ...peers.reduce<Record<string, string>>((acc, peer, idx) => {
        if (peer["presharedkey"]) {
          acc[`wireguard-peer-${idx}.preshared-key`] = peer["presharedkey"];
        }
        return acc;
      }, {}),
    },
  };

  const warnings: string[] = [];
  if (!address) {
    warnings.push("Interface address missing; connection will rely on DHCP");
  }
  if (!dnsList || !dnsList.length) {
    warnings.push("DNS servers not provided");
  }

  return {
    id: generateProfileId("wg"),
    name: profileName,
    type: "wireguard",
    nmConnection,
    rawConfig: config.trim(),
    warnings,
  };
}

function buildOpenVpnConfig(values: OpenVpnFormValues): string {
  const lines: string[] = ["client"];
  lines.push(`remote ${values.remote}${values.port ? ` ${values.port}` : ""}`.trim());
  if (values.proto) lines.push(`proto ${values.proto}`);
  if (values.username || values.password) lines.push("auth-user-pass");
  if (values.ca) lines.push(`ca ${values.ca}`);
  if (values.cert) lines.push(`cert ${values.cert}`);
  if (values.key) lines.push(`key ${values.key}`);
  if (values.tlsAuth) lines.push(`tls-auth ${values.tlsAuth}`);
  if (values.extraConfig) lines.push(values.extraConfig.trim());
  return lines.join("\n");
}

interface OpenVpnParseResult {
  name: string;
  data: Record<string, string>;
  secrets: Record<string, string>;
  warnings: string[];
}

function parseOpenVpnLines(config: string, explicitName?: string): OpenVpnParseResult {
  const data: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  const warnings: string[] = [];
  const lines = config.split(/\r?\n/);
  let name = explicitName?.trim() ?? "OpenVPN connection";
  let i = 0;
  const trimmedLines = lines.map((line) => line.trim());
  if (trimmedLines.some((line) => line.toLowerCase() === "client")) {
    data.mode = "client";
  }

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    i += 1;
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("<") && !line.startsWith("</")) {
      const tag = line.slice(1, line.indexOf(">")).toLowerCase();
      const blockLines: string[] = [];
      while (i < lines.length && !lines[i].trim().toLowerCase().startsWith(`</${tag}`)) {
        blockLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1; // skip closing tag
      }
      data[tag] = blockLines.join("\n").trim();
      continue;
    }
    const parts = line.split(/\s+/);
    const key = parts[0].toLowerCase();
    const value = parts.slice(1).join(" ");
    switch (key) {
      case "remote": {
        const [host, port, proto] = parts.slice(1);
        if (host) data.remote = host;
        if (port && !data.port) data.port = port;
        if (proto && !data.proto) data.proto = proto;
        if (!explicitName) {
          name = normaliseName(host, name);
        }
        break;
      }
      case "proto":
        data.proto = parts[1];
        break;
      case "port":
        data.port = parts[1];
        break;
      case "dev":
        data.dev = parts[1];
        break;
      case "auth-user-pass":
        data["auth-user-pass"] = value || "ask";
        if (!secrets.username) {
          secrets.username = "ask";
          secrets.password = "ask";
        }
        break;
      case "auth":
      case "cipher":
      case "compress":
      case "ca":
      case "cert":
      case "key":
      case "tls-auth":
      case "tls-crypt":
      case "remote-cert-tls":
      case "verify-x509-name":
      case "sndbuf":
      case "rcvbuf":
      case "resolv-retry":
      case "persist-key":
      case "persist-tun":
      case "comp-lzo":
        if (value) {
          data[key] = value;
        } else {
          data[key] = "true";
        }
        break;
      case "setenv":
        if (parts.length >= 2) {
          const envKey = parts[1];
          data[`setenv:${envKey}`] = parts.slice(2).join(" ");
        }
        break;
      case "auth-user-pass-verify":
        data[key] = value;
        break;
      case "script-security":
      case "keepalive":
      case "redirect-gateway":
        data[key] = value || "true";
        break;
      case "management":
        data.management = value;
        break;
      default:
        data[`extra:${key}`] = value;
        break;
    }
  }

  if (!data.remote) {
    warnings.push("OpenVPN config missing remote host");
  }

  return { name: normaliseName(name, "OpenVPN connection"), data, secrets, warnings };
}

function parseOpenVpnFromConfig(config: string, explicitName?: string): ParsedVpnProfile {
  const { name, data, secrets, warnings } = parseOpenVpnLines(config, explicitName);
  const nmConnection: NetworkManagerConnection = {
    connection: {
      id: name,
      type: "vpn",
      autoconnect: DEFAULT_AUTOCONNECT,
    },
    vpn: {
      service_type: "org.freedesktop.NetworkManager.openvpn",
      data,
    },
    ipv4: {
      method: "auto",
    },
    ipv6: {
      method: "auto",
    },
    secrets,
  };

  return {
    id: generateProfileId("ovpn"),
    name,
    type: "openvpn",
    nmConnection,
    rawConfig: config.trim(),
    warnings,
  };
}

export function parseWireGuardForm(values: WireGuardFormValues): ParsedVpnProfile {
  const config = buildWireGuardConfig(values);
  return parseWireGuardFromIni(config, values.name);
}

export function parseOpenVpnForm(values: OpenVpnFormValues): ParsedVpnProfile {
  const config = buildOpenVpnConfig(values);
  const profile = parseOpenVpnFromConfig(config, values.name);
  if (!profile.nmConnection.secrets) {
    profile.nmConnection.secrets = {};
  }
  if (values.username) {
    profile.nmConnection.secrets.username = values.username;
    profile.nmConnection.vpn = profile.nmConnection.vpn || {
      service_type: "org.freedesktop.NetworkManager.openvpn",
      data: {},
    };
    profile.nmConnection.vpn.data["auth-user-pass"] = "ask";
  }
  if (values.password) {
    profile.nmConnection.secrets.password = values.password;
    profile.nmConnection.vpn = profile.nmConnection.vpn || {
      service_type: "org.freedesktop.NetworkManager.openvpn",
      data: {},
    };
    profile.nmConnection.vpn.data["auth-user-pass"] = "ask";
  }
  return profile;
}

export function parseWireGuardConfig(config: string, name?: string): ParsedVpnProfile {
  return parseWireGuardFromIni(config, name);
}

export function parseOpenVpnConfig(config: string, name?: string): ParsedVpnProfile {
  return parseOpenVpnFromConfig(config, name);
}

export function parseVpnQrPayload(payload: string): ParsedVpnProfile {
  const trimmed = payload.trim();
  if (/\[interface\]/i.test(trimmed)) {
    return parseWireGuardConfig(trimmed);
  }
  if (/^client/m.test(trimmed) || /remote\s+/i.test(trimmed)) {
    return parseOpenVpnConfig(trimmed);
  }
  throw new Error("Unsupported VPN payload in QR code");
}
