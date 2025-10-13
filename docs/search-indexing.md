# Search Indexing Guide

The command palette uses a dedicated web worker (`workers/search.worker.ts`) and curated metadata from `lib/search/index.ts` to
search across desktop apps, pages, projects, and documentation. When you add new surface areas you must keep this index in sync so
queries remain relevant.

## Overview

1. `lib/search/index.ts` builds a merged collection of search documents for pages, projects, and Markdown docs.
2. `workers/search.worker.ts` normalizes the documents and handles `search` requests from the UI.
3. `components/ui/CommandPalette.tsx` sends debounced queries to the worker and renders results with loading/error states.

## Adding a new page entry

1. Create or update the Next.js page as usual.
2. Edit the `PAGE_DEFINITIONS` array in `lib/search/index.ts`:
   - Use a stable `id` (kebab-case) so results remain unique.
   - Set `title`, `summary`, and `url` (must match the page route).
   - Provide descriptive `keywords` to boost partial matches.
   - Optional: set `boost` if the page should outrank other content.
3. Add or update Jest coverage if page-specific logic impacts search ranking.

## Adding a project entry

Projects are loaded from `data/projects.json` and automatically indexed. To include a new project:

1. Append the project to `data/projects.json` with fields `title`, `description`, `demo` or `repo`, and optional `tags`, `stack`,
   or `language`.
2. Run `yarn test` to ensure ranking tests still pass.

The search worker will pick up the new project automatically because it reads the JSON at build time.

## Adding documentation

1. Add the Markdown file under `docs/`.
2. Append a record to `DOC_DEFINITIONS` in `lib/search/index.ts`:
   - `file`: exact file name (including extension and casing).
   - `slug`: kebab-case identifier used in search result IDs.
   - `title`: human readable heading shown in the UI.
   - `summary`: one sentence description displayed below the title.
   - Optional `keywords` array for additional matching terms.
3. Verify that the GitHub URL generated from `DOC_BASE_URL` and `file` is correct.
4. Update or add tests that exercise ranking for the new content if it introduces notable keywords.

## Updating tests

`__tests__/searchEngine.test.ts` covers ranking heuristics. When you add high-impact content:

- Add a focused test case to ensure the new document or project surfaces for representative queries.
- Keep queries deterministic (e.g., use the doc title) so rankings remain stable across refactors.

## Validation checklist

- [ ] Run `yarn lint` and `yarn test` after changing search metadata or worker logic.
- [ ] Confirm the command palette surfaces the new entry locally (`Ctrl+Space` by default).
- [ ] Capture a screenshot if UI layout changes.
