# Font loading verification

## Overview
- `pages/_app.tsx` now configures the Rajdhani Google Font with an explicit fallback stack and expanded unicode ranges (`latin` + `latin-ext`).
- Global tokens (`styles/tokens.css`) mirror the fallback stack so system UI fonts are available immediately while the web font swaps in.
- `_document.jsx` preconnects to `fonts.googleapis.com` and `fonts.gstatic.com` to reduce TLS and DNS startup time for Google Fonts.

## Checks
- Verified that the generated CSS from `next/font` includes `font-display: swap` and unicode ranges for `latin` and `latin-ext` subsets.
- Confirmed via the Next.js build analyzer (`yarn analyze`) that the font files are emitted once and no duplicate font subsets are bundled.

## Follow-up
- If additional locale subsets are required, add them to the `Rajdhani` configuration in `_app.tsx` and mirror any fallback updates in `styles/tokens.css`.
