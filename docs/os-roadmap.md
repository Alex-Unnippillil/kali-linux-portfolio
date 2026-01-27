# OS Roadmap

## Current Shell Capabilities
- **Boot and session entry** – `Ubuntu` orchestrates boot screen transitions, lock state, and shutdown recovery while persisting user choices (wallpaper, lock state, boot flag) in safe local storage.【F:components/ubuntu.js†L3-L177】
- **Desktop environment** – The desktop manager loads dynamic backgrounds, window chrome, overlay launchers, and context menus while persisting folder layouts and window sizes for workspaces.【F:components/screen/desktop.js†L3-L240】
- **Application catalog** – `apps.config.ts` registers utilities, simulators, and games through a dynamic factory and display helpers, providing metadata for launcher overlays and window instantiation.【F:apps.config.ts†L1-L200】

## Future OS-Grade Milestones
1. **Shell resilience & session continuity**
   - Harden boot/lock transitions for offline and exported builds.
   - Expand shutdown and resume states to cover multi-session snapshots.
   - Validate analytics for session switching scenarios.
2. **Workspace maturity**
   - Add per-workspace layouts, wallpaper themes, and persisted dock sets.
   - Introduce workspace-aware notifications and cross-monitor support.
3. **App lifecycle governance**
   - Centralize window spawn policies, background suspend/resume, and telemetry envelopes.
   - Provide crash recovery scaffolding for iframe-backed apps.
4. **Platform services rollout**
   - Service worker-based background sync for simulated tools.
   - Progressive caching for large app bundles and offline-first content.

## Phased Goals for Core Services
| Service | Phase 1 (Stabilize) | Phase 2 (Enhance) | Phase 3 (Scale) |
| --- | --- | --- | --- |
| **Windowing** | Audit overlay/window registries, ensure persisted sizes honor snap grid. Prereqs: `SystemOverlayWindow`, `Window`, `utils/windowLayout` functions.【F:components/screen/desktop.js†L10-L240】 | Implement tiling presets, workspace stacks, and per-app launch policies. Depend on `apps.config.ts` metadata for defaults.【F:apps.config.ts†L1-L200】 | Add multi-monitor abstractions and shared compositor events; coordinate with background tasks service. |
| **Session management** | Guarantee boot, lock, and shutdown flows sync to storage; map GA events to state transitions.【F:components/ubuntu.js†L47-L177】 | Add user profiles and quick user switching backed by persisted preferences and workspace themes. Requires extended safe storage module. | Introduce roaming profile export/import (static build safe) and scheduled snapshots coordinated via persistence service. |
| **System settings** | Surface wallpaper and icon presets already stored in desktop manager. Tie into Settings app backlog work for theme picker and reset flows.【F:components/screen/desktop.js†L201-L239】【F:docs/tasks.md†L58-L63】 | Add accessibility toggles, analytics opt-in, and simulated network settings. Depends on analytics and persistence enhancements. | Provide policy bundles (e.g., kiosk mode) and remote config hooks for showcase deployments. |
| **Background tasks** | Inventory current use of `requestAnimationFrame` and storage timers (boot sequence, window snapshots) to define scheduler interface.【F:components/ubuntu.js†L51-L88】【F:components/screen/desktop.js†L217-L240】 | Implement service-worker-backed task queue for simulated scans, weather updates, and notifications; coordinate with app catalog entries.【F:apps.config.ts†L63-L189】【F:docs/tasks.md†L20-L107】 | Add priority lanes, battery-aware throttling, and developer hooks for custom modules.

## Cross-Cutting Concerns
- **Analytics** – Boot, lock, and shutdown events already dispatch GA hits; window actions should adopt shared instrumentation to keep telemetry consistent across shell and apps.【F:components/ubuntu.js†L120-L169】【F:components/screen/desktop.js†L10-L24】
- **Persistence** – Safe local storage underpins backgrounds, folder contents, window sizes, and icon presets; roadmap items that alter layouts or settings must extend the storage schema carefully.【F:components/ubuntu.js†L91-L117】【F:components/screen/desktop.js†L36-L240】
- **Accessibility** – Desktop overlays and context menus need keyboard navigation parity and descriptive metadata; enhancements should be reviewed alongside Settings upgrades noted in the backlog.【F:components/screen/desktop.js†L14-L24】【F:docs/tasks.md†L58-L63】
- **Performance** – Boot sequencing leverages animation frames to avoid blocking the UI; future background services must preserve responsiveness by batching work and relying on requestAnimationFrame or worker threads.【F:components/ubuntu.js†L51-L88】【F:components/screen/desktop.js†L217-L240】

## Backlog Linkage and Tracking
- Align each milestone with actionable entries in `docs/tasks.md`, especially Settings, Terminal, and simulator upgrades already scoped.【F:docs/tasks.md†L20-L147】
- During planning reviews, annotate the backlog with roadmap phase tags (P1–P3) and capture progress via weekly status bullets referencing the relevant modules (`components/ubuntu.js`, `components/screen/desktop.js`, `apps.config.ts`).
- Maintain a changelog excerpt for each review summarizing what shipped against roadmap promises and updating remaining prerequisites before promoting items between phases.
