# Error code reference

The portfolio now surfaces the same error codes across the UI, bug-report form, and logs. Codes live in [`types/errorCodes.ts`](../types/errorCodes.ts) and include localized copy for English and Spanish so support agents can paste responses in either language.

## Quick usage notes

- **Error boundary** – When the desktop shell crashes it shows the localized summary, remediation text, and the code `ERR-UI-001`. The "Report this issue" button forwards the code into the Input Hub form.
- **Bug reports/Input Hub** – The bug-report preset can attach any code from the catalog. Submitted messages prepend the code so EmailJS tickets contain the reference automatically. Status toasts reuse the same catalog when EmailJS is offline or a send fails.
- **Logs** – The error boundary logger now tags telemetry with the same code, which lets you search for incidents server-side.

## Catalog

| Code | Summary (English) | Where it appears | Support remediation checklist |
| --- | --- | --- | --- |
| `ERR-UI-001` | Unexpected interface error | Error boundary overlay and bug-report picker | 1. Ask for the steps to reproduce and browser/OS.<br>2. Check Vercel or browser console logs for matching `ERR-UI-001` entries.<br>3. If repeatable, file an issue with the component name and stack trace. |
| `ERR-CONTACT-001` | Message service is offline | Input Hub status banner, bug-report picker | 1. Confirm EmailJS keys are present in the active `.env`.<br>2. Verify the EmailJS dashboard for service availability.<br>3. Communicate an alternate contact channel until the service is restored. |
| `ERR-CONTACT-002` | Message delivery failed | Input Hub status banner, bug-report picker | 1. Attempt a resend with reCAPTCHA enabled.<br>2. Review EmailJS dashboard for template errors or rate limits.<br>3. If failures persist, capture the payload and raise to engineering with the code. |

## Localization coverage

All codes ship with Spanish (`es`) strings alongside English (`en`). To add another locale, extend `SUPPORTED_LOCALES` in [`types/errorCodes.ts`](../types/errorCodes.ts) and populate the new language keys for each catalog entry.

## Adding a new code

1. Define the enum entry and localized copy in [`types/errorCodes.ts`](../types/errorCodes.ts).
2. Update any UI or logging surfaces that should raise the code.
3. Append a new row to the table above so the support rotation knows how to triage it.
