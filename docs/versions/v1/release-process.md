# Documentation Version Release Checklist

Use this checklist whenever you cut a new documentation version so the `/docs` portal, API, and consumers stay in sync.

## 1. Prepare the snapshot

1. Review merged PRs and decide which documents should be carried forward.
2. Copy the current version directory from `docs/versions/<current>` to a new folder named for the upcoming release (for example `docs/versions/v2`).
3. Remove or archive any guides that are intentionally dropped in the new release.
4. Author changelog notes in the new folder’s `README` or landing doc to summarize scope differences.

## 2. Wire up routing

1. Update `lib/docs/versions.ts` with the new version metadata. Mark the fresh release as `isCurrent: true` and flip the old entry to `false`.
2. Create a new page file under `pages/docs/<newVersion>/[[...slug]].tsx` by reusing `createVersionedDocsPage`.
3. Confirm `pages/docs/latest/[[...slug]].tsx` continues to point at the version flagged as current.
4. Run `yarn lint` to verify that static generation picks up the new paths without TypeScript errors.

## 3. Validate navigation and fallbacks

1. Start the dev server and browse `/docs/<newVersion>` and `/docs/latest`.
2. Spot-check a few documents in the new version plus one intentionally missing guide to ensure the fallback banner appears.
3. Use the version selector to bounce between releases and confirm the sidebar updates.

## 4. Update downstream references

1. Search the repo for `buildDocsLatestPath` usages and add explicit version links when you want to pin a doc to the new release.
2. Refresh test snapshots that assert documentation URLs.
3. If any client component (for example `HelpPanel`) should point to the new version, update the slug or default `version` query parameter.

## 5. Ship it

1. Commit the updated docs, routes, and metadata in a single PR.
2. Capture before/after screenshots of `/docs` if the landing page changed.
3. Announce the release in `CHANGELOG.md` with a summary of major doc updates.
4. Merge after CI passes and `yarn export` (if used) validates static generation.
