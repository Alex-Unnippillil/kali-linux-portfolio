import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import NetworkIndicator, { getConnectionSummary, hasSecureLabel } from "../components/ui/NetworkIndicator";

const createMatchMedia = (matches: boolean) =>
  function matchMedia(query: string): MediaQueryList {
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_event, handler) => {
        if (typeof handler === "function") {
          handler({ matches } as MediaQueryListEvent);
        }
      },
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as MediaQueryList;
  };

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
    });

    expect(summary.state).toBe("connected");
    expect(summary.label).toBe("Wired connection");
    expect(summary.meta).toBe("Connected • 1.0 Gbps");
  });
});

describe("NetworkIndicator interactions", () => {
  beforeEach(() => {
    // @ts-expect-error jsdom assignment for matchMedia
    window.matchMedia = createMatchMedia(false);
  });

  it("closes the panel on Escape and outside clicks", async () => {
    render(<NetworkIndicator allowNetwork online />);

    const trigger = screen.getByRole("button", { name: /wired connection connected/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Network menu" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("menu", { name: "Network menu" })).not.toBeInTheDocument(),
    );

    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Network menu" })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    await waitFor(() =>
      expect(screen.queryByRole("menu", { name: "Network menu" })).not.toBeInTheDocument(),
    );
  });

  it("uses the mobile sheet layout when the viewport is small", () => {
    // @ts-expect-error jsdom assignment for matchMedia
    window.matchMedia = createMatchMedia(true);
    render(<NetworkIndicator allowNetwork online />);

    fireEvent.click(screen.getByRole("button", { name: /wired connection connected/i }));

    const menu = screen.getByRole("menu", { name: "Network menu" });
    expect(menu.dataset.mobilePanel).toBe("true");
  });
});
