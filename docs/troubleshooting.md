# Troubleshooting errors

This guide explains how to recover when a desktop window, an app, or the entire workspace fails. It also documents how to
capture logs that intentionally redact sensitive fields.

## 1. Understand the error screen

The error screen now appears whenever a fatal issue is detected. It includes three key elements:

1. **Summary and next step.** The header calls out where the failure happened (desktop shell vs. individual app) and
   offers a short description of what to do next.
2. **Code frame.** The code block shows a trimmed stack trace. It is safe to share in bug reports because sensitive values
   are redacted before they reach the logger.
3. **Actions.** Use the retry button to reload the failing surface. The troubleshooting link points back to this page so
   you can follow deeper recovery steps.

## 2. Retry workflow

1. Click **Retry** on the error screen. For app windows this clears the boundary state and attempts to reload only that
   module. For the global desktop shell the retry action refreshes the page to ensure a clean boot.
2. If retry succeeds, continue your session as usual.
3. If the error repeats immediately, continue with the log capture steps below and file a bug.

## 3. Capture sanitized logs

1. Open the browser developer tools and switch to the **Console** tab.
2. Look for entries formatted as JSON. Each entry includes a `correlationId` that you can reference in bug reports.
3. Sensitive keys such as passwords, tokens, secrets, session identifiers, and authorization headers are automatically
   replaced with the placeholder `[REDACTED]`. Long strings are truncated to 500 characters and circular structures are
   collapsed to the string `"[Circular]"` so they are safe to copy.
4. Copy the relevant log entries and attach them to the issue tracker or support channel. Do not add any additional
   secrets manually.

## 4. Manual recovery checklist

1. Refresh the browser tab to clear any cached module state.
2. Clear local storage (`localStorage.clear()` in the console) if the error persists. This can reset stored layouts that
   might be corrupt.
3. Verify that you are running the latest build. A hard refresh (`Ctrl+Shift+R`) ensures that the service worker pulls the
   current bundle.
4. If only one app fails, try opening a different app to confirm the desktop shell still works. If multiple apps fail,
   capture logs and escalate.

## 5. Reporting issues

When reporting a bug include the following:

- The app or area that failed and the timestamp (include the correlation ID if possible).
- Screenshots of the error screen, including the stack trace preview.
- Any sanitized log entries captured from the console.
- Steps taken from the manual recovery checklist.

Providing this information upfront helps maintainers reproduce the bug without exposing private data.
