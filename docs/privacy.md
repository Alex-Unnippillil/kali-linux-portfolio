# Privacy and Redaction Helpers

This project ships with a client-side redaction utility that masks sensitive values before data leaves the sandbox. The helper replaces common identifiers with deterministic placeholders so exported files stay useful for demos while removing personal data.

## Placeholder catalog

| Pattern | Placeholder | Examples |
| --- | --- | --- |
| Email addresses | `<email>` | `analyst@corp.example` → `<email>` |
| IP addresses (IPv4 and IPv6) | `<ip>` | `192.168.0.5`, `2001:db8::1` → `<ip>` |
| IDs and tokens (JSON keys, GUIDs, labelled values) | `<id>` | `"userId": "a1b2"`, `Session ID: 12345`, `550e8400-e29b-41d4-a716-446655440000` → `<id>` |

The helper also returns counts for each category. UI components can display those totals to reassure users that masking occurred.

## Log export workflow

All log export buttons now funnel text through `lib/redact.ts` before download or clipboard copy. When redaction removes anything, the UI logs a console message with the counts. This keeps demo artifacts shareable without leaking names, emails, or infrastructure details.

Affected screens include:

- Nikto and Nessus reports (both app and page variants)
- Recon-ng workspace exports
- dsniff summaries and QR scanner batches
- Generic CSV exports rendered through `ResultViewer`
- Mimikatz text exports

## Consent center

Visit `/privacy/consent-center` to try the masking routine manually. Paste a log or upload a `.txt` / `.json` export and the page will show:

- The redacted output ready to copy
- Counts of redacted emails, IPs, and IDs
- Status messages confirming whether anything was masked

Use this tool when preparing walkthroughs or documentation—everything you copy from the consent center is already sanitized.
