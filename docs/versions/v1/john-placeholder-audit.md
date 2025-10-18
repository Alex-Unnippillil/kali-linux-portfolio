# John the Ripper placeholder audit

This note tracks all hard-coded placeholders that back the John simulators so we can keep demo data consistent across both the desktop window (`components/apps/john/index.js`) and the Next.js training hub (`apps/john`).

## Registry: `components/apps/john/placeholders.js`

| Key | Usage | Notes |
| --- | --- | --- |
| `banners.desktop` | Desktop window banner | Displays the "Demo only" warning inside the draggable app. |
| `banners.page` | Next.js page banner | Mirrors the banner in the standalone John lab. |
| `sampleWordlists` | Dropdown in the desktop app | Provides the `/samples/*.txt` options and descriptions used when a user wants canned data. |
| `hashedPasswords` | Pre-loaded hashes/passwords | Seeds the cracking simulation and ensures both apps show the same MD5 examples. |
| `fallbackHash` | Uncracked hash placeholder | Keeps one hash in a failed state to demonstrate negative outcomes. |
| `defaultWordlist` | Default textarea contents | Populates the inline editor with a short baseline list. |
| `auditUsers` | Audit simulator sample users | Supplies usernames/passwords for the password policy helper. |
| `weakPasswords` | Audit simulator weak password definitions | Keeps the helper consistent with the placeholder accounts. |

These values are intentionally generic and map to widely cited examples (`password`, `123456`, etc.) referenced in training material. Update this registry before modifying either the desktop app or the lab page so the audit stays accurate.

## Fixture-backed content

The richer lab content (wordlists, command scenarios, interpretation cards) lives in `data/john/lab-fixtures.json` and is validated via unit tests. That JSON is the source of truth for any new lab-mode material.

## Review cadence

- If you add or remove placeholders in either John experience, refresh this table.
- Keep hashed placeholders aligned with public demo hashes (e.g., `5f4dcc3…`).
- When you change fixture datasets, cross-check with `docs/john-lab-fixtures.md` for provenance updates.
