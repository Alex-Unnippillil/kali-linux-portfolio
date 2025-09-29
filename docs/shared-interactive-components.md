# Shared interactive component inventory

This inventory captures the reusable interactive elements (buttons, cards, tiles) that live under `components/ui`, `components/apps`, and `components/desktop`.

| Directory | Component | Interaction type | Notes |
| --- | --- | --- | --- |
| `components/ui` | `NotificationBell.tsx` | Icon button with dropdown | Opens a notification panel with grouped items, dismissal controls, and keyboard trapping. |
| `components/ui` | `QuickSettings.tsx` | Settings surface | Toggleable panel for theme, sound, network, and motion preferences. |
| `components/ui` | `TabbedWindow.tsx` | Tab strip | Provides draggable tabs, close buttons, and a "new tab" action for apps that need multiple documents. |
| `components/ui` | `Breadcrumbs.tsx` | Navigation buttons | Renders breadcrumb buttons for hierarchical navigation within apps. |
| `components/apps` | `app-grid.js` | App tiles | Virtualized grid of launcher tiles that delegates individual tile rendering to `UbuntuApp`. |
| `components/desktop` | `Layout.tsx` | Desktop shell container | Establishes desktop layout variables; no direct interactive targets but defines environment for shared controls. |

> **Note:** The launcher tile itself is implemented in `components/base/ubuntu_app.js`, but it is consumed by `components/apps/app-grid.js` and receives the same interaction tokens defined for the shared inventory above.
