# Internationalization Guide

This project now centralizes locale-aware number and date formatting through `utils/format.tsx`. The utilities expose a React context, hooks, and helper functions that make it easy to render content using alternate numbering systems (e.g., Arabic-Indic digits) and calendars (e.g., Buddhist or ISO-8601).

## Default configuration

The `LocaleProvider` reads optional environment variables when computing its defaults:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_LOCALE` | Base locale (e.g., `en-US`, `ar-EG`). |
| `NEXT_PUBLIC_NUMBERING_SYSTEM` | Unicode numbering system tag (e.g., `latn`, `arab`, `deva`). |
| `NEXT_PUBLIC_CALENDAR` | Calendar identifier (`gregory`, `buddhist`, `iso8601`, etc.). |
| `NEXT_PUBLIC_TIME_ZONE` | Preferred IANA time zone to use when components do not supply one. |

Set these in `.env.local` to change the defaults used by the entire application. If they are omitted, the provider falls back to `en-US`, the Latin numbering system, and the Gregorian calendar. On the client the provider also observes `navigator.language` so that the UI respects the user’s browser preference when no override is supplied.

## Using the formatter in React components

Wrap your component tree with the `LocaleProvider`. This is already done at the app shell level (`pages/_app.jsx`), so child components can call `useFormatter()` directly:

```tsx
import { useFormatter } from '../utils/format';

function Timestamp({ value }: { value: string | number | Date }) {
  const { formatDateTime } = useFormatter();
  return (
    <time dateTime={new Date(value).toISOString()}>
      {formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' })}
    </time>
  );
}
```

`useFormatter` returns helpers for numbers, dates, and relative time. They automatically apply the active locale, numbering system, calendar, and default time zone. If you need a one-off formatter for a specific set of preferences, you can call `createFormatter({ locale, numberingSystem, calendar })` to build a stateless helper without touching React.

## Formatting outside React

Modules that are not React components (for example, plain scripts under `apps/`) can still reuse the logic by importing the named functions:

```ts
import { formatDateTime } from '../utils/format';

const label =
  formatDateTime(timestamp, { dateStyle: 'full' }) ||
  new Date(timestamp).toLocaleString();
```

When you bypass the provider you can pass explicit overrides so that output stays deterministic.

## Testing and snapshots

Snapshot tests that rely on locale-sensitive output should wrap the subject with `LocaleProvider` so that Jest renders the same markup you see in the browser. The new `__tests__/format.test.tsx` file provides examples that cover Arabic-Indic digits, Buddhist calendar years, and ISO-8601 formatting. Use `textContent` (or similar) in snapshots to avoid whitespace differences from the DOM serializer.

## Adding new locales or calendars

1. Ensure the desired locale data is supported by the runtime (`Intl` APIs must recognize the BCP 47 tag you provide).
2. If a component needs a specific numbering system or calendar, pass overrides to `useFormatter`:
   ```tsx
   const { formatDateTime } = useFormatter({ calendar: 'buddhist' });
   ```
3. Prefer Unicode extension subtags (`-u-nu-`, `-u-ca-`) over manual string manipulation—the utilities handle this when you pass `numberingSystem` and `calendar`.
4. Update or add snapshot tests whenever you introduce a new locale-sensitive code path.

Following these steps keeps the entire desktop shell consistent regardless of which numbering systems or calendars a user selects.
