# Networking

## Wi-Fi Insights module

- **Location:** `apps/wifi-insights` and `/apps/wifi-insights` desktop entry.
- **Purpose:** Visualises simulated Wi-Fi scan data for quick channel health checks.
- **Shell:** Renders inside `WindowMainScreen` with responsive two-column channel grid.
- **Data:** Populated through `workers/wifiScan.ts` (≤3 s turnaround). The worker automatically falls back to offline/demo mode and only emits the bundled fixtures.
- **Visuals:** `components/apps/wifi/ChannelChart` wraps the existing `StatsChart` bars with accessible captions. `SecurityBadgeList` surfaces security posture badges, while `NetworkList` shows per-network metadata.
- **Exports:** Uses `utils/export.ts` helpers for JSON/CSV clipboard copy and file download. Buttons live in the window header actions.
- **Accessibility:** Charts include `<figcaption>` descriptions and sr-only summaries so the simulation is screen reader friendly.
- **Notes:** Keep new data additions under the 3 second worker SLA and update badge variants if new security types are introduced.
