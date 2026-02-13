# Redaction and export safety

The redaction scanner runs before export and download flows that deal with textual data. It is designed to reduce the risk of accidentally sharing credentials or other sensitive tokens while still keeping the demo experience lightweight.

## What gets flagged

The scanner currently ships with the following high-confidence rules:

- AWS access key identifiers and associated secret access keys.
- GitHub personal access tokens (prefixes `ghp_`, `gho_`, `ghs_`, `ghu_`, `ghr_`).
- Google Cloud API keys (`AIza…`).
- Slack bot/user tokens (`xox…`).
- Stripe live secret keys (`sk_live_…`).
- PEM-encoded private key blocks.
- JSON Web Tokens that parse into valid headers.
- Payment card numbers that satisfy the Luhn checksum.
- HTTP `Authorization: Basic …` headers with decodable username/password pairs.

Each finding is replaced with a `«redacted:<rule-id>»` placeholder by default. When a match is discovered the user is shown a preview that includes a short description and a snippet of the redacted output. From there they can either:

1. Accept the redacted version (default),
2. Cancel the download altogether, or
3. Override the redaction and export the original content.

## Limitations

- Only textual blobs (`text/*`, `application/json`, `application/xml`, `application/csv`, `application/x-yaml`, `application/javascript`) are scanned today. Binary exports fall back to the original behaviour.
- Patterns are tuned to minimise false positives (<5% against the demo corpus), which means the scanner intentionally avoids very generic entropy checks. Extremely novel or proprietary token formats may slip through.
- JWT detection only verifies the structure of the header and payload; encrypted (JWE) tokens are not flagged.
- Secrets embedded inside compressed archives are not detected.

## Messaging guidelines

- Use action-driven phrasing: “Potential secrets found in <filename>. Download a redacted copy?”
- Always present the number of matches, their type, and a preview of the redacted output.
- Clearly label overrides as riskier choices. For example: “Download original unredacted content? Choosing Cancel keeps the download cancelled.”
- When surfacing hints or rule descriptions, prefer short, recognisable identifiers (e.g. “AWS access key id”).

These rules are defined in `utils/redact/rules.ts` and can be extended when new demo flows need extra coverage.
