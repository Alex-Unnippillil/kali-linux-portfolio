# John the Ripper lab fixtures

The simulator now ships a cohesive fixture pack that powers the lab-mode experience for John the Ripper. The data set covers trimmed wordlists, command scenarios, and interpretation cards. Everything lives alongside the UI so training content works offline and during static exports.

## Wordlist excerpts

| ID | Label | Fixture | Notes |
| --- | --- | --- | --- |
| `seclists-top-20` | SecLists Top 20 (trimmed) | `/fixtures/john/seclists-top-20.txt` | Short list of high-frequency passwords drawn from the SecLists common credential catalog. |
| `seclists-names` | SecLists Names (excerpt) | `/fixtures/john/seclists-names.txt` | Focused list of common given names, matching the John UI's username demos. |
| `ncsc-top-10` | UK NCSC Top 10 (2023 excerpt) | `/fixtures/john/ncsc-top-10.txt` | Public statistics from the UK National Cyber Security Centre, mirrored for offline practice. |

Each fixture entry includes its provenance, path, and a preview payload in `data/john/lab-fixtures.json`. The JSON powers the lab panels and the automated tests that validate schema integrity.

## Safe command scenarios

The lab exposes three scenarios through the command builder:

1. **Raw MD5 single hash** – demonstrates format selection and wordlist pairing for a single compromised credential.
2. **Zip archive hash** – shows how to target PKZIP workloads with a names-based list.
3. **SHA1 audit replay** – intentionally fails so instructors can discuss fallback tactics.

The builder feeds on `commands` in the fixture file to generate a sanitized `john` invocation. Wordlist overrides stay inside the fixture set so users never accidentally reference live infrastructure.

## Result interpretation deck

Two result cards cover the baseline workshop narratives:

- **Raw-MD5 quick win** – highlights the success path and calls out what the session summary means.
- **Wordlist exhausted without match** – walks through failure output and how to interpret the remaining hash count.

The cards map back to command IDs, letting the UI filter guidance dynamically inside Lab Mode.

## Dataset sources

- [SecLists](https://github.com/danielmiessler/SecLists) – Used for the `seclists-top-20` and `seclists-names` fixtures. Only tiny excerpts are embedded to keep the repo lightweight.  
- [UK NCSC most common passwords 2023](https://www.ncsc.gov.uk/blog-post/most-common-passwords-2023) – Provides the basis for the `ncsc-top-10` excerpt and interpretation scenario.

Review this file whenever you update `lab-fixtures.json` so the provenance stays accurate.
