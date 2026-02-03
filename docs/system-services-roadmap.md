# System Services Roadmap

This document establishes a shared roadmap for the desktop shell services that power the simulated Ubuntu/Kali experience. It clarifies existing responsibilities, defines forward-looking features, and documents the data, observability, and resilience standards required for new work.

## Current Responsibilities

### `components/ubuntu.js`
- Hosts the top-level desktop lifecycle (boot, lock, shutdown) and orchestrates screens rendered within `Layout`.
- Reads and writes persisted UI state through `safeLocalStorage` (background image, boot seen flag, lock/shutdown status) to deliver user continuity while remaining SSR-safe.
- Drives boot sequencing with `waitForBootSequence`, combining `window.load` and a timeout fallback to ensure the boot screen clears even when `load` is delayed.
- Emits screen change analytics via `utils/analytics.ts` helpers, keeping navigation events consistent for dashboards and simulations.
- Exposes actions (`lockScreen`, `unLockScreen`, `shutDown`, `turnOn`, `changeBackgroundImage`) consumed by child components, centralizing side effects such as DOM focus management and persistence.

### `components/base/ubuntu_app.js`
- Provides the canonical “desktop icon” behavior including keyboard accessibility, drag state tracking, touch activation, and icon launch animation.
- Delegates actual app launch through the `openApp(id)` callback, ensuring shell services can manage window instantiation.
- Prefetches app modules through an optional `prefetch` prop and caches the attempt per icon to avoid redundant network work.
- Normalizes UI state (hover, selection, accent variables) and hints for assistive tech, guaranteeing consistency across all desktop apps.

### Supporting Utilities
- **Analytics (`utils/analytics.ts`)** – Dispatches events to `window.gtag` when available, uses try/catch to fail safely, and provides semantic helpers (`logGameStart`, `logGameEnd`, etc.) for apps to emit consistent events.
- **Storage (`utils/safeStorage.ts`)** – Exposes `safeLocalStorage`, which guards direct `localStorage` access when the API is unavailable (SSR, privacy mode). Desktop services should always interact through this shim.
- **Boot sequencing** – Implemented in `components/ubuntu.js` via requestAnimationFrame/timeout mix. Future features should reuse the same sequencing hooks to avoid reintroducing race conditions.

## Next-Step Features

| Feature | Description | Required Hooks / APIs |
| --- | --- | --- |
| Session switching | Multiple user personas with distinct local state profiles and lock screen identities. | Extend `safeLocalStorage` keys with per-session namespaces; add session selector component that consumes `Ubuntu` actions and exposes a session change event for analytics. |
| Notification center | Unified toast/history pane for system and app alerts. | Introduce pub/sub channel (can leverage `utils/pubsub.ts`) and register `UbuntuApp` instances to forward app-level notifications. Requires analytics events for notification delivery/open and QA hooks for unread counts. |
| Power management simulation | Simulate suspend/resume, low-power modes, and timed sleep. | Add timers in `Ubuntu` shell plus feature-flagged APIs to apps (`window.desktop.power`) so experiences can respond. Include hooks for mock battery telemetry sourced from a new mock service module. |
| Background task orchestration | Scheduler for long-running mock operations (downloads, scans). | Expand existing worker utilities or add a `TaskManager` service that integrates with mock services. Provide an API for apps to register tasks with status callbacks and analytics for task lifecycle. |

## Data Flow & Extension Guidelines

- **Persistence**: Maintain all desktop-level settings through `safeLocalStorage`. New keys must include a version prefix (e.g., `v2:session:active`) and feature-flag guards to support migrations.
- **Analytics**: Emit screen and service events through `utils/analytics.ts` helpers. Add new semantic wrappers in `utils/analytics.ts` instead of inline calls to keep typings centralized. All analytics additions require accompanying unit tests that validate the wrapper usage.
- **Mock services**: Background features should rely on in-repo mock modules (e.g., `utils/moduleStore.ts`, `utils/pubsub.ts`) rather than network calls. When creating a new mock service, provide TypeScript types and a Jest suite covering success, timeout, and failure paths.
- **Feature flags**: Gate experimental services behind `utils/feature.ts` toggles or environment variables defined in `.env.local.example`. Document each flag in this roadmap and in the README when promoted to stable.
- **Testing**: Extend Jest coverage around new data flows and, where applicable, add Playwright smoke checks that exercise state persistence. Regression tests should cover serialization/deserialization of stored state and analytics emission under both enabled/disabled flag conditions.

## Observability & Resilience Expectations

- **Timeout handling**: Follow the boot sequence pattern—combine event listeners with deterministic timeouts to avoid deadlocks. Mock services must expose configurable timeouts and return structured error objects that the shell can display.
- **Graceful degradation**: All services should detect `safeLocalStorage` or analytics unavailability and no-op without throwing. Provide visual fallbacks (e.g., disabled controls) and log to `utils/logger.js` at `warn` level for QA diagnostics.
- **Instrumentation**: Emit analytics events for success, failure, and cancellation paths. When adding background schedulers, incorporate performance marks or counters surfaced via the QA smoke run.
- **QA alignment**: Update smoke and regression test plans to include new services. Each feature must document: manual verification steps, scenarios for Playwright automation, and expected analytics payloads. QA sign-off requires demonstrating that toggling feature flags does not break core boot, lock, or app launch flows.

By adhering to these guardrails, future system services will remain aligned with the existing desktop shell architecture while expanding the simulation’s depth responsibly.
