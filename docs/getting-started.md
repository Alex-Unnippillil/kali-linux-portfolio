# Getting Started

This project is built with [Next.js](https://nextjs.org/).

## Prerequisites

- Node.js 20
- yarn or npm

## Installation

```bash
yarn install
```

## Running in Development

```bash
yarn dev
```

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).

## Localization and locales

Formatting helpers for dates, numbers, and plurals live in [`src/i18n/format.ts`](../src/i18n/format.ts). They wrap the browser `Intl` APIs and provide caching plus safe fallbacks when those APIs are unavailable.

### Adding a new locale

1. Pick the [BCP-47](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) locale tag you want to support (for example, `es-ES`).
2. Instantiate helpers with `createLocaleFormatters('<locale>')` or call `formatDate`, `formatNumber`, and `formatPlural` directly with the new locale where you need formatted output.
3. If the locale has preferred defaults (time zone, currency, ordinal rules), pass them as the second argument to `createLocaleFormatters` so the rest of the UI can rely on a single definition.
4. Add or update tests in `__tests__/i18n.format.test.ts` to snapshot the expected output for the locale. This protects against regressions when Node or browser `Intl` data changes.
5. Run `yarn lint` and `yarn test` before submitting your changes.

The helpers fall back to ISO-style strings and simple plural selection when `Intl` is missing, so the UI stays readable even in constrained environments.
