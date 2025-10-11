# Mimikatz Fixture Provenance

This note documents the curated data sources that power the simulated Mimikatz experience. The goal is to show where each JSON
fixture originates, how it was sanitized, and what reviewers should double-check when refreshing the lab content.

## Credential dump fixtures

- **File:** `components/apps/mimikatz/credentialDumps.json`
- **Source material:**
  - Sanitized `sekurlsa::logonpasswords` screenshots from Benjamin Delpy's public Mimikatz demonstrations.
  - Microsoft Defender for Identity and DFIR workshop slides that highlight the `31d6cfe0d16ae931b73c59d7e0c089c0` blank-password sentinel and lab-only AES key excerpts.
  - Red-team training guides that describe delegated token structures and golden-ticket payloads; only shortened hexadecimal or
    base64 fragments are retained.
- **Sanitization notes:**
  - Account names use the fictional `ACME` domain and example service identities.
  - Secrets are either well-known sentinels (blank password hash), shortened hexadecimal strings, or synthetic passphrases.
  - Context and explanations emphasize defender takeaways rather than exploitation steps.

## Blue team event log fixture

- **File:** `components/apps/mimikatz/eventLogs.json`
- **Source material:** Microsoft security auditing documentation for Event IDs 4688, 4611, and 4624. The fixture links directly
  to the published guidance so reviewers can verify wording and mitigation steps.
- **Sanitization notes:** Hostnames reference lab systems (for example `LAB-WKS01`) and never touch production identifiers.

## Command builder presets

- **File:** `components/apps/mimikatz/modules.json`
- **Source material:** Official Mimikatz usage notes (`sekurlsa::logonpasswords`, `lsadump::sam`, `token::list`) combined with
  community incident-response playbooks outlining safe demonstration parameters.
- **Sanitization notes:**
  - Defaults point to fake dump paths or illustrative switches so commands remain copy-only.
  - The UI funnels every preset through a builder that renders strings without running them.

## Maintenance checklist

When updating any of the fixtures:

1. Reconfirm that every account, hostname, and path references a fictional environment.
2. Trim or hash any credential material so it cannot authenticate anywhere.
3. Update this document with the new references so reviewers can audit provenance quickly.
4. Add or adjust Jest tests so the UI continues rendering each dataset correctly.

Keeping this log current ensures the simulator stays educational and legally safe while providing meaningful defender insights.
