# Feedback workflow

The desktop shell now includes a feedback dialog for reporting bugs, feature requests, and general comments. This document
covers how the flow works so maintainers can test or extend it.

## Entry points

- Any component can render `<FeedbackDialog />`. The dialog requires `isOpen` and `onClose` props and automatically handles
  focus trapping via the shared `Modal` utility.
- The Whisker application menu exposes a "Feedback workflow" link that opens `/docs/feedback` for quick guidance.

## Submission lifecycle

1. Users supply a summary (5+ characters) and detailed description (10+ characters).
2. They can optionally consent to attach a diagnostic bundle by checking the consent box.
3. On submit we redact the summary/description, build the bundle if consented, and emit analytics events.
4. Payloads are posted to `/api/support/report` when available. We fall back to `/api/dummy` during local development.

## Diagnostic bundle contents

| Field              | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `stateHash`        | Deterministic hash of a sanitized snapshot (location, theme, workspace hints, storage keys) |
| `vitals.timestamp` | ISO timestamp when the bundle was generated.                                               |
| `vitals.userAgent` | Redacted UA string from `navigator.userAgent`.                                             |
| `vitals.memory`    | Optional heap/device-memory stats from the performance API.                                |
| `vitals.viewport`  | `window.innerWidth`/`window.innerHeight` to help reproduce layout issues.                  |

The snapshot is sanitized before hashing via the utilities in `utils/redaction.ts`. Obvious tokens, emails, and long
hex strings are replaced with placeholders.

## Testing checklist

- `yarn test FeedbackDialog` verifies validation, redaction, and packaging.
- Mock `submitFeedback` to capture outbound payloads when wiring a new endpoint.
- Confirm analytics fire by asserting `logEvent`/`trackEvent` in Jest or by inspecting GA in preview.

## Extending the flow

- Provide a custom `getStateSnapshot` prop if an app has richer state to hash.
- Override `submitFeedback` in integration tests to avoid hitting network stubs.
- Update `types/feedback.ts` if you need to add new diagnostic fields so the redaction helper picks them up automatically.
