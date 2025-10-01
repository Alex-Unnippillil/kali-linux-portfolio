# ADR-0003: Internationalization approach

- **Status:** Accepted
- **Date:** 2025-02-14
- **Deciders:** Core maintainers
- **Consulted:** Documentation team
- **Tags:** UX, localization

## Context

The desktop metaphor leans heavily on terminal copy, security jargon, and playful references to Kali Linux. Today the experience ships in English only, with strings scattered across React components, JSON fixtures, and worker messages. Community members have asked for localized copy, but we have limited bandwidth to maintain multiple languages and must ensure translations do not drift from the simulated-security intent. We need a pragmatic i18n approach that keeps the door open to future locales without forcing contributors to translate every app immediately.

## Decision

- English remains the **default and required locale**. New features must include complete English copy before considering additional languages.
- Introduce a **gradual extraction model**: as components are touched, move user-facing strings into locale dictionaries under `data/i18n/<locale>.json`. Each entry should use stable message keys (`desktop.lock.label`, `apps.nmap.shortDescription`, etc.).
- Components load strings through a thin helper (e.g., `getMessage('desktop.lock.label')`) that reads from the dictionaries with an English fallback. Until the helper exists globally, localized copy can be injected via props from a higher-level module that reads the dictionaries.
- Use native [`Intl`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl) APIs for formatting dates, numbers, and relative times instead of bundling new libraries.
- Accessibility text (ARIA labels, tooltips) must be translated together with visible labels to avoid mismatched languages.
- Translation contributions require a maintainer review plus a subject-matter review when the text describes security tooling, to prevent inaccurate terminology.

## Consequences

- The UI stays coherent in English while we build up translation coverage gradually alongside feature work.
- Centralized dictionaries allow automated lint rules or scripts to detect missing translations and unused keys, but they introduce an extra layer of indirection for developers.
- Using `Intl` avoids inflating the bundle, yet some formats (e.g., plural rules) will still need lightweight helpers around `Intl.PluralRules`.
- Until a runtime language switcher ships, alternative locales can only be compiled statically or selected via environment/configuration flags.

## Implementation Notes

- Add a README to `data/i18n/` when the first dictionary lands so contributors know the schema.
- Tests that render user-facing copy should assert against message keys resolved through the helper instead of hardcoded strings.
- Coordinate with the documentation team to keep marketing material aligned with the in-app terminology for each supported locale.

## Related ADRs

- [ADR-0002](./0002-caching-strategy.md) – locale dictionaries are static assets and benefit from service worker precaching.
