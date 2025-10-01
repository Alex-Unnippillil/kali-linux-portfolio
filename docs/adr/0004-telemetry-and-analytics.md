# ADR-0004: Telemetry and analytics

- **Status:** Accepted
- **Date:** 2025-02-14
- **Deciders:** Core maintainers
- **Consulted:** Privacy review
- **Tags:** analytics, privacy

## Context

The project collects limited usage telemetry to understand how visitors interact with the simulated desktop. Existing integrations include Google Analytics 4 via `utils/analytics.ts`, Vercel Analytics, and Vercel Speed Insights wired in `pages/_app.jsx`. Telemetry must stay optional, respect user privacy, and avoid introducing network calls that could resemble real offensive operations. Contributors sometimes propose adding new trackers or custom event streams; without guardrails the codebase could accumulate redundant scripts and inconsistent opt-out behaviour.

## Decision

- **Approved providers** remain Google Analytics 4 (via the existing wrapper), Vercel Analytics, and Vercel Speed Insights. Adding new providers requires a dedicated ADR.
- All telemetry initialisation is gated behind the `NEXT_PUBLIC_ENABLE_ANALYTICS` flag. The default `.env.local` keeps analytics disabled; production deployments opt in explicitly.
- Events must be **namespaced** to match desktop interactions (`desktop.window.open`, `apps.nmap.run`, etc.) and routed through the shared helper in `utils/analytics.ts` to ensure consistent sampling and error handling.
- No telemetry events may include user-provided payloads verbatim. Sanitize inputs and reduce them to categorical metadata before sending.
- Background workers or API routes may not emit telemetry directly. They must surface events to the main thread or server handlers that already enforce feature flags and rate limits.
- Document any new event in `docs/architecture.md` (or relevant feature docs) so the analytics schema stays discoverable.

## Consequences

- Analytics remains minimal and controllable, aiding performance and compliance.
- Restricting providers reduces integration flexibility, but it keeps the bundle lean and simplifies privacy audits.
- Developers must thread telemetry through the shared helper, adding a small layer of indirection compared to direct SDK calls.
- Opt-in gating means local development and PR deploys behave deterministically with analytics disabled unless explicitly enabled for testing.

## Implementation Notes

- Update `.env.local.example` when new flags are introduced so contributors know how to opt in.
- Ensure SSR paths guard against undefined `window` when analytics is disabled.
- Playwright smoke tests should stub analytics endpoints when `NEXT_PUBLIC_ENABLE_ANALYTICS` is true to keep CI deterministic.

## Related ADRs

- [ADR-0002](./0002-caching-strategy.md) – analytics requests bypass caches to ensure accurate reporting.
