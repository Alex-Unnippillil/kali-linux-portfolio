import {
  parseOpenVpnConfig,
  parseWireGuardConfig,
  parseVpnProfile,
  detectProfileType,
} from '../../utils/vpnParser';

describe('vpnParser', () => {
  it('parses OpenVPN configuration metadata and inline blocks', () => {
    const configText = `# sample profile
client
remote vpn.example.com 1194
proto udp
port 1194
auth-user-pass
<ca>
-----BEGIN CERTIFICATE-----
CA DATA
-----END CERTIFICATE-----
</ca>
`;

    const parsed = parseOpenVpnConfig(configText);

    expect(parsed.type).toBe('openvpn');
    expect(parsed.remote).toBe('vpn.example.com');
    expect(parsed.port).toBe(1194);
    expect(parsed.protocol).toBe('udp');
    expect(parsed.auth).toBe('username/password');
    expect(parsed.blocks.ca).toContain('BEGIN CERTIFICATE');
    expect(parsed.options.remote).toEqual('vpn.example.com 1194');
  });

  it('parses WireGuard configuration sections and peers', () => {
    const configText = `[Interface]
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = abcdef
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;

    const parsed = parseWireGuardConfig(configText);

    expect(parsed.type).toBe('wireguard');
    expect(parsed.interface['Address']).toEqual(['10.0.0.2/32']);
    expect(parsed.interface['DNS']).toEqual(['1.1.1.1']);
    expect(parsed.peers).toHaveLength(1);
    expect(parsed.peers[0]).toMatchObject({
      publicKey: 'abcdef',
      endpoint: 'vpn.example.com:51820',
      allowedIps: ['0.0.0.0/0', '::/0'],
      persistentKeepalive: 25,
    });
  });

  it('detects configuration type from filename and content', () => {
    expect(detectProfileType('profile.ovpn', '')).toBe('openvpn');
    expect(detectProfileType('wg.conf', '')).toBe('wireguard');
    expect(
      detectProfileType(
        'no-extension',
        '[Interface]\nAddress = 10.0.0.1/24\n[Peer]\nPublicKey = key',
      ),
    ).toBe('wireguard');
  });

  it('parses VPN profile based on detection', () => {
    const wgConfig = `[Interface]\nAddress = 10.0.0.2/32`; // minimal
    expect(parseVpnProfile('wg.conf', wgConfig).type).toBe('wireguard');

    const ovpnConfig = 'remote vpn.example.com 1194';
    expect(parseVpnProfile('profile.ovpn', ovpnConfig).type).toBe('openvpn');
  });
});
