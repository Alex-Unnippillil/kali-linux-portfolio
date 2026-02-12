# Storage Usage Report

This report summarizes where the application interacts with browser `localStorage` and `sessionStorage`.

- **Total references:** 425 across 112 files.
- **Directory distribution:**
  - `components`: 248
  - `apps`: 59
  - `utils`: 33
  - `games`: 29
  - `hooks`: 17
  - `pages`: 9
  - `public`: 23
  - other directories contain minimal usage.
- **Session storage:** Only `components/apps/chrome/index.tsx` uses `sessionStorage` for tracking the last visited URL.

## Anonymization Recommendations

- Store only non-sensitive identifiers; hash or otherwise anonymize values if they might contain personal data.
- Use descriptive yet generic keys (e.g., avoid usernames in keys).
- Provide user-accessible controls to clear or reset stored data.
- Document any storage of potentially sensitive information in code comments.
- Monitor new storage interactions via automated tests to ensure they are reviewed.

The baseline data for these findings lives in `scripts/storage-audit.json` and is validated by a regression test.
