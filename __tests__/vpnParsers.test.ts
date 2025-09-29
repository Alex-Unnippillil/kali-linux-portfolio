import {
  loadVpnProfile,
  parseOpenVpnConfig,
  parseVpnQrPayload,
  parseWireGuardConfig,
  persistVpnProfile,
  profileNeedsPassphrase,
} from "../utils/vpn";

describe("VPN parsers", () => {
  const sampleWireGuard = `
[Interface]
Address = 10.0.0.2/32
PrivateKey = abcdefg1234567890=
DNS = 1.1.1.1,8.8.8.8
ListenPort = 51820

[Peer]
PublicKey = peerpublickey=
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = vpn.example.com:51820
PresharedKey = peersharedkey=
PersistentKeepalive = 25
`;

  const sampleOpenVpn = `
client
remote vpn.example.com 1194 udp
proto udp
port 1194
auth-user-pass
<ca>
-----BEGIN CERTIFICATE-----
MIIB...END
-----END CERTIFICATE-----
</ca>
`;

  beforeEach(async () => {
    window.localStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("keyval-store");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to reset IDB"));
      request.onblocked = () => resolve();
    });
  });

  it("parses WireGuard configs into NetworkManager structures", () => {
    const profile = parseWireGuardConfig(sampleWireGuard, "Home WG");
    expect(profile.name).toBe("Home WG");
    expect(profile.nmConnection.connection.type).toBe("wireguard");
    expect(profile.nmConnection.wireguard?.listen_port).toBe(51820);
    expect(profile.nmConnection.wireguard_peer?.[0].allowed_ips).toContain("0.0.0.0/0");
    expect(profile.nmConnection.secrets?.["wireguard.private-key"]).toBe("abcdefg1234567890=");
    expect(profileNeedsPassphrase(profile)).toBe(true);
  });

  it("parses OpenVPN configs including inline certificate blocks", () => {
    const profile = parseOpenVpnConfig(sampleOpenVpn, "Work VPN");
    expect(profile.name).toBe("Work VPN");
    expect(profile.nmConnection.connection.type).toBe("vpn");
    expect(profile.nmConnection.vpn?.data.remote).toBe("vpn.example.com");
    expect(profile.nmConnection.vpn?.data.ca).toContain("BEGIN CERTIFICATE");
    expect(profileNeedsPassphrase(profile)).toBe(false);
  });

  it("detects VPN type from QR payloads", () => {
    const qrProfile = parseVpnQrPayload(sampleWireGuard);
    expect(qrProfile.type).toBe("wireguard");
    const qrProfile2 = parseVpnQrPayload(sampleOpenVpn);
    expect(qrProfile2.type).toBe("openvpn");
  });

  it("requires a passphrase when persisting sensitive profiles", async () => {
    const profile = parseWireGuardConfig(sampleWireGuard, "Secure WG");
    await expect(persistVpnProfile(profile)).rejects.toThrow("passphrase");
    await persistVpnProfile(profile, "supersecurepass");
    const loaded = await loadVpnProfile(profile.id, "supersecurepass");
    expect(loaded?.nmConnection.wireguard_peer?.[0].endpoint).toBe("vpn.example.com:51820");
  });

  it("persists OpenVPN profiles without a passphrase when no secrets exist", async () => {
    const profile = parseOpenVpnConfig(sampleOpenVpn, "Public OVPN");
    await persistVpnProfile(profile);
    const loaded = await loadVpnProfile(profile.id);
    expect(loaded?.nmConnection.vpn?.data.remote).toBe("vpn.example.com");
  });
});
