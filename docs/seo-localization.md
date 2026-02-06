# SEO localization checklist

This project centralizes SEO locale settings in `lib/seo/config.ts` so that
canonical URLs and `hreflang` link tags stay consistent across pages. Use this
reference when adding a new locale or adjusting URL behavior.

## Key files

- `lib/seo/config.ts` — declares supported locales, the canonical origin, and
  helper utilities (`buildCanonicalUrl`, `buildAlternateLinks`, and
  `resolveCanonicalPath`). These utilities normalise incoming routes, strip the
  base path, and ensure localized URLs map back to the default canonical route.
- `components/SEO/Meta.tsx` — consumes the helpers above to emit `<link
  rel="alternate">` entries, canonical URLs, and JSON-LD metadata.
- `pages/_document.jsx` — reads the default locale to set the `<html lang>`
  attribute and exposes the canonical origin via `data-canonical-origin`.
- `__tests__/components/SEO/Meta.test.tsx` — regression coverage that verifies
  canonical and alternate link generation.

## Adding a new locale

1. **Declare the locale.** Append a new object to `SEO_LOCALES` in
   `lib/seo/config.ts` with the following properties:
   - `locale`: the Next.js locale identifier (e.g. `fr`).
   - `hrefLang`: the value that should appear in `hreflang` (e.g. `fr-CA`).
   - `ogLocale`: Open Graph locale tag (e.g. `fr_CA`).
   - `htmlLang`: `<html lang>` fallback (e.g. `fr`).
   - `pathPrefix`: optional route prefix such as `/fr`. When present it is
     removed from canonical URLs and re-applied for localized alternates.
   - `isDefault`: set to `true` for the canonical language. Only one entry
     should include this flag.
2. **Create localized routes.** Ensure pages for the locale exist (for example
   under `pages/fr/...`) or leverage i18n routing so the generated links resolve
   correctly.
3. **Update tests if necessary.** Extend
   `__tests__/components/SEO/Meta.test.tsx` with expectations for the new
   locale’s `hreflang` output. This protects against regressions in the link
   matrix.
4. **Review social metadata.** Update copy in `components/SEO/Meta.tsx` or
   localized variants if the new language requires different titles or
   descriptions.
5. **Verify in SSR.** Run `yarn test` to exercise the SSR snapshot checks and
   confirm the rendered `<head>` includes the alternate links for each locale.

## Tips

- The helpers normalise query strings and fragments automatically, so you do
  not need to trim them manually when building localized pages.
- Set `NEXT_PUBLIC_BASE_PATH` (or `BASE_PATH`) when deploying under a sub-path.
  The utilities in `lib/seo/config.ts` account for the base path when composing
  canonical URLs and alternates.
- Always include an `x-default` link when adding locales. The helper adds it
  automatically by pointing to the default locale’s canonical URL.
