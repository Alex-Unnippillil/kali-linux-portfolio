# Internationalization formatting helpers

The portfolio ships locale-aware helpers in `lib/intl.ts` that wrap the
built-in `Intl` constructors. Use these helpers instead of calling
`new Intl.DateTimeFormat()` or `toLocaleString()` directly. They centralize
locale detection, ensure server/client parity, and give us a single place to
handle fallbacks.

## When to use them

- **Dates and times** — `formatDate`, `formatDateRange`, and
  `createDateFormatter` cover one-off strings and memoized formatters.
- **Numbers** — `formatNumber`, `formatCurrency`, and `formatPercent` handle
  numeric output including currency, percent, and engineering notation.
- **Relative timestamps** — `formatRelativeTime` and
  `createRelativeTimeFormatter` format phrases such as “yesterday” or
  “in 3 hours”.

## Example

```ts
import { formatDate, formatCurrency } from '@/lib/intl';

const published = formatDate(post.timestamp, {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const price = formatCurrency(199.99, 'USD');
```

## Why

1. **Consistent locale resolution** – `resolveLocale` inspects explicit inputs,
   browser preferences, and server defaults before falling back to `en-US`.
2. **Edge-case handling** – Helpers sanitize invalid dates or numbers so the UI
   degrades gracefully.
3. **Centralized updates** – If we need to polyfill or tweak formatting we do it
   once instead of hunting through components.

> 📝 Tip: When you need repeated formatting inside a render loop, memoize the
> formatter with `createDateFormatter` / `createNumberFormatter` to avoid
> re-instantiating objects on every render.
