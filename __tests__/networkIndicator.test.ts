import { getConnectionSummary, hasSecureLabel } from "../components/ui/NetworkIndicator";

describe("hasSecureLabel", () => {
  it("labels secured Wi-Fi networks", () => {
    expect(
      hasSecureLabel({
        id: "wifi",
        name: "Lab",
        type: "wifi",
        strength: "good",
        secure: true,
        details: "WPA2",
      }),
    ).toBe("Secured");
  });

  it("labels open Wi-Fi networks", () => {
    expect(
      hasSecureLabel({
        id: "cafe",
        name: "Cafe",
        type: "wifi",
        strength: "fair",
        secure: false,
        details: "Portal",
      }),
    ).toBe("Open");
  });

  it("labels wired networks as active", () => {
    expect(
      hasSecureLabel({
        id: "wired",
        name: "Ethernet",
        type: "wired",
        details: "Connected",
      }),
    ).toBe("Active");
  });
});

describe("getConnectionSummary", () => {
  const wifiNetwork = {
    id: "homelab",
    name: "HomeLab 5G",
    type: "wifi" as const,
    strength: "excellent" as const,
    secure: true,
    details: "Auto-connect • WPA2",
  };

  it("describes an offline state", () => {
    const summary = getConnectionSummary({
      allowNetwork: true,
      online: false,
      wifiEnabled: true,
      network: wifiNetwork,
      metered: false,
      throttled: false,
    });

    expect(summary.state).toBe("offline");
    expect(summary.description).toBe("Waiting for connection");
    expect(summary.tooltip).toBe("Offline");
  });

  it("indicates when Wi-Fi is disabled", () => {
    const summary = getConnectionSummary({
      allowNetwork: true,
      online: true,
      wifiEnabled: false,
      network: wifiNetwork,
      metered: false,
      throttled: false,
    });

    expect(summary.state).toBe("disabled");
    expect(summary.label).toBe("Wi-Fi disabled");
    expect(summary.tooltip).toBe("Wi-Fi disabled");
  });

  it("includes a privacy notice when remote requests are blocked", () => {
    const summary = getConnectionSummary({
      allowNetwork: false,
      online: true,
      wifiEnabled: true,
      network: wifiNetwork,
      metered: false,
      throttled: false,
    });

    expect(summary.state).toBe("blocked");
    expect(summary.label).toBe("Requests blocked");
    expect(summary.meta).toContain("Secured");
    expect(summary.notice).toBeDefined();
    expect(summary.tooltip).toContain("Requests blocked");
  });

  it("describes a wired connection", () => {
    const wiredNetwork = {
      id: "wired",
      name: "Wired connection",
      type: "wired" as const,
      details: "Connected • 1.0 Gbps",
    };

    const summary = getConnectionSummary({
      allowNetwork: true,
      online: true,
      wifiEnabled: true,
      network: wiredNetwork,
      metered: false,
      throttled: false,
    });

    expect(summary.state).toBe("connected");
    expect(summary.label).toBe("Wired connection");
    expect(summary.meta).toBe("Connected • 1.0 Gbps");
  });
  it("highlights metered data when throttling is enabled", () => {
    const summary = getConnectionSummary({
      allowNetwork: true,
      online: true,
      wifiEnabled: true,
      network: wifiNetwork,
      metered: true,
      throttled: true,
    });

    expect(summary.label).toBe("Metered connection");
    expect(summary.meta).toContain("Metered data policy");
    expect(summary.meta).toContain("Background sync throttled");
    expect(summary.tooltip).toContain("Metered");
  });
});
