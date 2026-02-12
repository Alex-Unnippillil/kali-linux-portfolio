# Crash reporter flow

This document explains how crash reports are captured, sanitised, and presented in the Kali Linux Portfolio desktop.

## Overview

1. The crash handler (`modules/crash/reporting.ts`) normalises raw errors, generates a crash ID, and builds a human readable
   summary.
2. Sensitive information is scrubbed with `utils/logs/privacy.ts` before it is logged, displayed, or exported.
3. The crash reporter worker (`workers/crashReporter.ts`) and API endpoint (`pages/api/crash/report.ts`) both rely on the
   crash handler to keep responses consistent across environments.
4. The UI dialog (`components/apps/crash-reporter/CrashSummary.tsx`) presents the formatted summary with one-click copy
   helpers for the crash ID and combined summary.

## Crash handler

- `createCrashReport(payload)` accepts a `CrashPayload` containing the error, optional metadata, user steps, and logs.
- `generateCrashId()` produces IDs shaped like `CRASH-<timestamp base36>-<random>`. The timestamp is derived from the payload
  when provided so that server-side logs and UI reports can line up.
- The handler automatically:
  - Normalises the error object/string into `{ name, message, stack }`.
  - Sanitises strings, metadata, logs, and stack traces through the privacy scrubber.
  - Produces a structured `CrashReport` with a `summary` string and `details` block for downstream consumers.

The summary layout includes severity, location (app/component/route), captured time, last action, stack snippet, user steps,
context metadata, and recent logs. Only the first few entries of each section are kept so reports stay readable.

## Privacy scrubber

`utils/logs/privacy.ts` exports two helpers:

- `scrubSensitiveText(text)` masks home directory paths, file URIs, bearer tokens, API keys, session tokens, and common
  environment secrets. Windows, macOS, and Linux style paths are covered.
- `scrubSensitiveData(payload)` recursively walks objects/arrays to redact nested values while avoiding circular references.

Both functions return new values, so callers can safely store or transmit the sanitised payload.

## Worker usage

`workers/crashReporter.ts` listens for `{ type: 'report-crash', payload }` messages, creates a crash report, then posts back one
of the following:

- `{ type: 'crash-report', report }` with the sanitised `CrashReport`.
- `{ type: 'crash-report-error', error }` if the report could not be created.

Use this worker when crash formatting work should stay off the main thread (e.g., while capturing heavy stack traces).

## API endpoint

`POST /api/crash/report` accepts a `CrashPayload` JSON body and returns `{ crashId, summary, report }`. The response is
sanitised by the crash handler and matches what the worker posts back. Non-POST requests receive `405 Method Not Allowed`.

## UI dialog

`CrashSummary` wraps the base `Modal` component and exposes:

```tsx
<CrashSummary
  isOpen={isOpen}
  onClose={handleClose}
  summary={report.summary}
  crashId={report.details.crashId}
/>
```

The dialog contains:

- Title + helper text encouraging users to share the crash information.
- Crash ID section with inline copy button feedback.
- Scrollable summary block with copy support (`summary` + crash ID) and sanitized multiline formatting.
- Close button plus an overlay that also closes when clicked.

## Testing

Jest coverage lives in `__tests__/crashReporting.test.ts` and verifies both the crash handler output and the privacy scrubber.
Run `yarn test crashReporting` (or `yarn test` for the full suite) before shipping updates.
