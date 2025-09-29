export type VpnProfileType = "wireguard" | "openvpn";

export interface NetworkManagerConnection {
  connection: {
    id: string;
    type: "wireguard" | "vpn";
    autoconnect: boolean;
    uuid?: string;
  };
  vpn?: {
    service_type: "org.freedesktop.NetworkManager.openvpn";
    data: Record<string, string>;
  };
  wireguard?: {
    private_key: string;
    listen_port?: number;
    fwmark?: number;
    peer_routes?: boolean;
    mtu?: number;
  };
  wireguard_peer?: Array<{
    public_key: string;
    endpoint?: string;
    allowed_ips?: string[];
    preshared_key?: string;
    persistent_keepalive?: number;
  }>;
  ipv4?: {
    method: "auto" | "manual" | "disabled";
    address_data?: Array<{ address: string; prefix?: number }>;
    dns?: string[];
  };
  ipv6?: {
    method: "auto" | "manual" | "disabled";
    address_data?: Array<{ address: string; prefix?: number }>;
    dns?: string[];
  };
  secrets?: Record<string, string>;
}

export interface ParsedVpnProfile {
  id: string;
  name: string;
  type: VpnProfileType;
  nmConnection: NetworkManagerConnection;
  rawConfig: string;
  warnings: string[];
}

export interface WireGuardFormValues {
  name: string;
  address: string;
  privateKey: string;
  dns?: string;
  listenPort?: string;
  peerPublicKey: string;
  peerEndpoint?: string;
  peerAllowedIps: string;
  peerPresharedKey?: string;
  persistentKeepalive?: string;
}

export interface OpenVpnFormValues {
  name: string;
  remote: string;
  port?: string;
  proto?: string;
  username?: string;
  password?: string;
  ca?: string;
  cert?: string;
  key?: string;
  tlsAuth?: string;
  extraConfig?: string;
}
