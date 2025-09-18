# App Launcher Catalog

The desktop launcher uses `data/apps.json` as the source of truth for app metadata. Each entry contains:

- `id` – app identifier matching the entry in `apps.config.js`.
- `title` – human readable name rendered in the launcher.
- `category` – primary grouping (system, media, productivity, utilities, development, security, portfolio, games).
- `tags` – searchable keywords and aliases.

`utils/appCatalog.ts` exposes typed helpers that wrap the JSON payload. Use these helpers instead of importing the JSON directly so future schema tweaks can be isolated.

## Categorised grid

`components/apps/app-grid.js` now renders categories with section headers. When the search field is empty the launcher shows every category, preserving the order defined in `data/apps.json`. Once the user types, the grid swaps to a condensed results view.

## Search pipeline

- `workers/appSearch.worker.ts` initialises a Fuse.js index using the documents returned by `getSearchDocuments()`.
- Queries are debounced in the main thread and dispatched to the worker. Results stream back with match indices that power inline highlighting.
- The worker is hot-swappable; when metadata changes only `data/apps.json` needs to be updated. Tests (`__tests__/appSearch.test.ts`) assert the worker stays performant.

## Maintenance checklist

1. Add the new app to `apps.config.js` as usual.
2. Append the same `id` and `title` to `data/apps.json` with an appropriate category and tag list.
3. Run `yarn test appCatalog` to ensure the metadata parity checks keep passing.
4. Update category descriptions if a new grouping is needed.

These steps keep the launcher consistent between the desktop, `/apps` listing, and the worker-backed search experience.
