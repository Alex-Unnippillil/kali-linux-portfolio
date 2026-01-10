# Command palette search behaviour

The desktop command palette is designed to be a fast way to jump between applications, open windows, documentation and static pages. The search runs in a dedicated web worker so the UI thread stays responsive even as the index grows.

## Index sources

The worker builds the searchable index from four sources:

- **Applications** – metadata from `apps.config.js` and any open windows that can be re-focused.
- **Documentation** – Markdown files exposed under `/docs`. A static manifest (`/docs/index.json`) provides titles and summaries so no file system access is needed at runtime.
- **Pages** – entries discovered through `/sitemap.xml`, giving quick access to top-level routes such as landing pages and app directories.
- **Settings actions** – quick toggles and shortcuts that are surfaced alongside apps.

Each group is rendered as its own section. Keyboard navigation supports Arrow keys, Home/End, and Enter to launch an item.

## Ranking and recents

Search scoring prioritises:

1. Exact matches on the item title.
2. Prefix matches on the title.
3. Keyword and subtitle matches.
4. Recently used items, which receive a boost even with an empty query.

Command palette selections are written to `localStorage` via `utils/recentStorage.ts`. The worker receives those recency signals so popular commands bubble to the top on subsequent searches. A maximum of 25 items is kept to avoid unbounded growth.

## Offline support

The offline fallback page now reads from the service worker cache to display:

- Cached applications (anything under `/apps/` that was visited while online).
- Cached documentation entries from `/docs/index.json`.
- Cached pages discovered in `/sitemap.xml`.

This ensures the same sources that power the command palette are visible when the user returns while offline.
