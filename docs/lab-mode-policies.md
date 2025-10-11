# Lab Mode Policies

Security simulators across the Kali Linux Portfolio intentionally run in a **Lab Mode** sandbox. Contributors should follow the
guidelines below whenever they touch `components/LabMode.tsx`, update app gating flows, or ship new datasets.

## Purpose

- Keep every security tool strictly educational. Lab Mode renders fixtures, command builders, and copy-only outputs so no live
  exploit attempts or network probes occur.
- Provide consistent UX across simulators so visitors immediately understand the safety envelope before enabling advanced
  panels.

## Activation Flow

1. **Explicit acknowledgement** – Gated apps must collect a user acknowledgement explaining that datasets are static and for
   training only. Avoid auto-enabling Lab Mode without that consent.
2. **Prominent banner** – Once inside a simulator, display the yellow Lab Mode banner from `components/LabMode.tsx`. It should
   be the only way to toggle simulations on/off.
3. **Persisted intent** – Respect the Lab Mode persistence controls but never assume a user opted in. Each simulator must stay
   read-only until the banner is enabled or the acknowledgement flow completes.

## Dataset Handling

- Store fixtures under `/fixtures/` or within the app bundle. Never fetch from third-party targets.
- Surface dataset provenance in the UI (e.g., `fixtures/suricata.json`) and clarify that uploads stay in-browser.
- Sanitize docs and copy to warn users against pasting client or production data.

## Testing Requirements

- Unit tests must verify that catalog filters respect dataset boundaries and that Lab Mode toggles surface safety metadata.
- When adding simulators, include fixture-loading tests so CI confirms the demo content is still available.

## References

- [NIST SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

