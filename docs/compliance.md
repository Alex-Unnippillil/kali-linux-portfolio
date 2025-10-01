# Compliance Operations Overview

This document captures the controls tracked in the Kali Linux Portfolio settings checklist. Each section names the control, describes what teams must verify, documents the telemetry or logging expectations, and lists the responsible owner.

## Content Security Policy (CSP)
- **Expectation:** Enforce a restrictive CSP that whitelists required domains for scripts, styles, fonts, images, media, frames, and connections. Review inline allowances and nonce usage quarterly.
- **Permissions:** Browser feature permissions (camera, microphone, notifications, clipboard, and pointer lock) must be requested only when a user explicitly opts in within the relevant app window.
- **Audit & Telemetry:** Capture CSP violation reports and surface them in security dashboards; correlate with release changes to detect regressions.
- **Owner:** Platform Security Engineering.
- **Documentation:** `/docs/compliance.md#content-security-policy-csp` (this document).
- **Update Cadence:** Full review during every major release and whenever third-party embeds or CDN endpoints change.

## Desktop Permissions Governance
- **Expectation:** Inventory permissions requested by each simulated desktop app. Maintain least-privilege defaults and expose toggles in settings where runtime revocation is supported.
- **Permissions:** Track usage of notifications, clipboard, filesystem access (File System Access API), and any custom browser permissions used by simulations.
- **Audit & Telemetry:** Log permission prompts, acceptance/denial, and revocations. Store anonymized metrics to validate opt-in flows.
- **Owner:** Application Platform Team.
- **Documentation:** `/docs/compliance.md#desktop-permissions-governance`.
- **Update Cadence:** Validate before each monthly release window and whenever a new application requests elevated capabilities.

## Audit Logging
- **Expectation:** Ensure app windows emitting security-relevant events write structured audit logs (JSON) that include actor, action, target, result, and timestamp. Retain logs for at least 90 days.
- **Permissions:** Limit access to audit log configuration to administrators; expose read-only viewers in observability tools.
- **Audit & Telemetry:** Forward logs to the centralized SIEM and alert on suspicious sequences (e.g., repeated failed authentications in simulated tools).
- **Owner:** Security Operations Center (SOC).
- **Documentation:** `/docs/compliance.md#audit-logging`.
- **Update Cadence:** Quarterly verification plus ad-hoc reviews after every incident postmortem.

## Telemetry Transparency
- **Expectation:** Disclose analytics collectors (Google Analytics, Vercel Analytics, Speed Insights) in the privacy settings. Offer opt-out switches backed by feature flags.
- **Permissions:** Restrict addition of new telemetry sinks without documented review and explicit user messaging.
- **Audit & Telemetry:** Monitor flag usage and ensure opt-out state propagates to analytics wrappers. Record consent changes for compliance review.
- **Owner:** Privacy Engineering & Developer Experience.
- **Documentation:** `/docs/compliance.md#telemetry-transparency`.
- **Update Cadence:** Review opt-out flow at every minor release and whenever analytics packages upgrade.

## Responsible Ownership and Updates
- **Checklist Stewardship:** The Settings → About compliance checklist is owned by the Governance, Risk, and Compliance (GRC) working group. They coordinate updates with Platform Security, Application Platform, SOC, and Privacy Engineering.
- **Update Cadence:**
  - **Routine:** Monthly sync to confirm statuses and refresh notes.
  - **Release Gates:** Mandatory verification during major release readiness reviews.
  - **Incident Response:** Immediate re-validation following any incident or audit finding related to these controls.
- **Change Process:** Owners should update the checklist through the UI, export a JSON snapshot for records, and submit documentation updates via pull request referencing this file.

