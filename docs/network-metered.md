# Metered connection simulation

The desktop shell now surfaces NetworkManager's `Device.Metered` flag throughout the portfolio UI. Because the project runs as a self-contained demo, the integration uses a deterministic dataset that mirrors how NetworkManager classifies common scenarios (wired LAN, trusted Wi-Fi, captive portals, and mobile hotspots).

## Detection model

The simulated API lives in [`utils/networkManager.ts`](../utils/networkManager.ts) and returns [`NM_DEVICE_METERED_*`](https://networkmanager.dev/docs/api/latest/nm-dbus-types.html#NMDeviceMetered) values for the connection currently selected in the status menu. Profiles cover:

- `wired` — `NM_DEVICE_METERED_NO`
- `homelab` — `NM_DEVICE_METERED_GUESS_NO`
- `redteam` — `NM_DEVICE_METERED_UNKNOWN`
- `espresso` — `NM_DEVICE_METERED_YES`
- `pineapple` — `NM_DEVICE_METERED_GUESS_YES`
- `pixelhotspot` — `NM_DEVICE_METERED_YES` (Android hotspot)

Switching networks in the indicator re-queries the simulated API so that the UI always reflects the latest NetworkManager guidance.

## UI surface area

- **Settings → Metered connection policy** presents the raw NetworkManager state, lets you override it, and exposes a "Throttle background sync" toggle. Enabling throttling simulates `systemd --user` drop-ins that slow telemetry, sync, and timer units while metered is active.
- **Quick settings** now shows whether the active link is metered, provides instant overrides (auto, force metered, force unmetered), and lets you toggle the background sync throttle without leaving the panel.
- **Status menu** adds amber dot indicators for metered links, includes policy metadata in the hover tooltip, and surfaces override controls alongside the existing Wi-Fi selector.

## Mobile hotspot expectations

Selecting **Pixel 8 Hotspot** in the status menu represents a modern mobile tether. NetworkManager reports `NM_DEVICE_METERED_YES`, so:

1. The indicator badge shows an amber marker and the tooltip mentions the metered policy.
2. Quick settings and the Settings app both switch to "Metered" automatically.
3. Background sync throttling becomes available (and defaults to off so you can opt in).
4. Documentation and UI copy note that telemetry and sync services are deferred whenever the throttle is enabled, mirroring how Linux desktops adjust `systemd` units on costly links.

If you override the hotspot to "Force unmetered," the amber dot disappears, throttling disables itself, and the summary strings update accordingly. Use "Re-query NetworkManager" in Settings to demonstrate how the simulated D-Bus response drives the rest of the UI.
