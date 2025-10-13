# Contact funnel instrumentation

## Overview

The contact surfaces now emit GA4-compatible events through `utils/analytics.ts`. All
signals are sanitized before dispatch so that emails, phone numbers, and other
personally identifiable information (PII) are masked or removed. Each browser
session receives an anonymized identifier (`sid_XXXXXX`) stored in
`sessionStorage`; this lets us build conversion reports without storing PII.

## Funnel steps

| Stage | Event (`category: contact_funnel`) | Notes |
| --- | --- | --- |
| Impression | `view_contact_entry` | Fired by `/contact` and both in-app contact experiences when rendered. |
| Form intent | `form_started` | Logged on first focus/change in any contact form field. |
| Submission success | `submission_success` | Logged after the API returns success and drafts are cleared. |

Supporting events track validation outcomes, captcha issues, fallback usage,
attachment activity, and call-to-action (CTA) interactions. All event labels
use `key=value` pairs (e.g., `surface=apps-contact;sid=sid_ab12cd`).

## Event catalogue

| Action | Description | Details in `label` |
| --- | --- | --- |
| `validation_error` | Form-level validation failures. | `field` (email/message). |
| `submission_failure` | Submission errors (network, captcha, server codes). | `reason`. |
| `captcha_error` | Captcha token fetch/validation issues. | `reason`. |
| `fallback_presented` | Fallback UI displayed. | `reason`. |
| `draft_restored` / `draft_cleared` | Draft lifecycle events. | – |
| `attachment_added` | Files accepted in the uploader. | `added`, `total`. |
| `attachment_rejected` | Attachment rejected (size limits). | `reason`. |
| `attachment_removed` | Item removed from carousel. | `remaining`. |
| `cta_copy_email` | Email copy buttons across surfaces. | `channel` or `surface`. |
| `cta_open_mail_client` | Mail client open actions. | `via`. |
| `cta_copy_message` | Message/template copy actions. | `via`. |

## Privacy guardrails

`utils/analytics.ts` applies the following before forwarding events to GA4:

- Emails are replaced with `[email]` and long digit sequences become `[redacted]`.
- Labels keep only word characters, digits, spaces, `.`, `-`, `|`, `:` and `=`.
- Non-finite numeric values and unsafe fields are dropped.
- All contact events automatically include the anonymized `sid` token.

## Reporting

A Node script ships with the repository to summarise conversion and drop-off:

```bash
yarn report:contact-funnel # defaults to data/contact-funnel-events.ndjson
# or provide a GA export explicitly
yarn report:contact-funnel path/to/export.ndjson
```

The script expects NDJSON or JSON array exports containing GA4 events with the
fields `category`, `action`, `label`, and optional `session`. It prints:

- Total sessions observed and overall conversion rate.
- Conversion per funnel step.
- Breakdown tables for validation errors, submission failures, fallback reasons,
  attachment problems, and CTA usage.

## Stakeholder workflow

1. Export GA4 events filtered to `category = contact_funnel` (recommended
   dimensions: `eventName`, `eventTimestamp`, `label` custom dimension, session
   ID).
2. Save the export locally (e.g., `data/contact-funnel-events.ndjson`).
3. Run `yarn report:contact-funnel` and share the resulting summary in the
   weekly marketing/product analytics update.
4. Use the `label` metadata to drill into surfaces (`surface` key) or error
   causes (`reason`, `field`).

For bespoke dashboards (Looker Studio, Amplitude, etc.), mirror the same funnel
steps (`view_contact_entry → form_started → submission_success`) and apply the
`sid` dimension to keep counts aligned with the privacy-safe identifiers.
