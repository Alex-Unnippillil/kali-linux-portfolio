# Quote Data Pipeline

The Quote app rotates through a bundled set of offline JSON packs so it keeps working when
network APIs are unavailable. Use this checklist whenever you add or update quote sources.

## File locations

- Core pack: [`quotes/database.json`](../quotes/database.json)
- Technology pack: [`components/apps/quotes_tech.json`](../components/apps/quotes_tech.json)
- Loader: [`quotes/localQuotes.ts`](../quotes/localQuotes.ts)

All packs are registered in `PACK_SOURCES` inside `quotes/localQuotes.ts`. Each entry is
normalized, deduplicated by `content` + `author`, and filtered with the shared
`SAFE_TAGS` allow list.

## JSON format

Each quote object should follow this shape:

```json
{
  "quote": "Text of the quote",
  "author": "Author name",
  "tags": ["technology", "wisdom"]
}
```

The loader accepts either a `quote` or `content` field. Tags are optional, but providing at
least one entry from `SAFE_TAGS` (`inspirational`, `life`, `love`, `wisdom`, `technology`,
`humor`, `general`) avoids extra keyword guessing.

## Adding a new pack

1. Drop the JSON file into `quotes/` or `components/apps/quote/` (keep it under version
   control).
2. Import the file and add it to `PACK_SOURCES` in `quotes/localQuotes.ts`.
3. Run `yarn test quoteRotation` (or `yarn test` for the full suite) to confirm processing
   and rotation still pass.
4. Update the docs table in `docs/app-ecosystem-roadmap.md` if the new pack changes
   readiness, and note the pack in the PR summary so reviewers can sanity-check it.

## Custom imports at runtime

The app still lets users import additional JSON at runtime. Those entries flow through the
same normalizer and deduplication logic, so keeping the static packs tidy prevents duplicate
content and helps the "no repeat" rotation run predictably.
