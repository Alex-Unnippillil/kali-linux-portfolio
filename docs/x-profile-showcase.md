# X profile showcase

The desktop X window and `/apps/x` share one read-only application for
[@AUnnippillil](https://x.com/AUnnippillil). It uses the existing native window
manager; it does not replace the Kali desktop or require visitors to sign in.

## Server configuration

Rotate credentials that have been posted in a conversation, screenshot, issue,
or source repository. Do not paste replacement secrets into chat or commit them.

In the existing Vercel project's **Settings → Environment Variables**, add a
fresh app-only **`X_BEARER_TOKEN`** for **Production and Preview**, then redeploy
those environments. Use Vercel's sensitive/encrypted secret storage. Never prefix
this key with `NEXT_PUBLIC_`. The server reads the credential at runtime; neither
API responses nor browser JavaScript contain it.

An OAuth 1.0a alternative requires all four server-only values: `X_API_KEY`,
`X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET`. An access token and
token secret alone are insufficient. The same names with `TWITTER_` prefixes are
accepted for an existing configuration. A Bearer Token takes precedence when both
methods are configured. `X_FEED_ENABLED=false` disables fetching without removing
credentials. No X environment variable is required to build or run other apps.

The X developer app must have the access and billing/usage allowance required by
its account. This release does not purchase credits, change billing, create
subscriptions, request write permissions, or expose a visitor credential form.

## Data path and privacy

`GET /api/x/profile` resolves the fixed handle with
`GET https://api.x.com/2/users/by/username/AUnnippillil`, then reads
`GET https://api.x.com/2/users/{id}/tweets`. It never accepts a visitor-supplied
username or destination URL. Only the public profile and its own available posts
are displayed; reposts, withheld entries, and protected accounts are excluded.
The server uses the documented `post.fields`/`note_post` fields and narrowly
retries the older `tweet.fields` spelling only after an explicit invalid-field
response. `X_API_FIELD_STYLE=tweet` selects that spelling from the first request
for older API deployments.

The Activity API is for new event delivery, not a replacement for this timeline
backfill. This showcase intentionally does not create paid event subscriptions
or open long-lived streams on serverless functions.

Responses are cached for up to 15 minutes, with no stale-on-error policy. The
warm server instance coalesces concurrent reads, limits in-flight work, bounds
its page cache, and observes upstream rate limits. These controls and CDN caching
reduce reads; they are not a globally coordinated spend cap across regions or
server instances. Set spending limits in the X developer console. No polling
runs while the app is closed; Refresh respects the cache window.

Pagination uses server-signed, expiring cursors with 20 posts per request and at
most five pages (100 loaded posts). Invalid cursors and unsupported query fields
are rejected before making an upstream request. User/private/deleted content is
not permanently copied to disk, IndexedDB, local storage, or the service worker.
An already loaded browser page is a snapshot until refreshed. The service worker
uses NetworkOnly for this route, ahead of the general API cache rule.

Network permission follows the existing desktop setting. Disabling it aborts
pending requests and clears the visible feed. Static exports have no API server
and show the external public profile link instead. The source does not contain
fabricated profile posts; deterministic content exists only in test fixtures.

## Interface and failure states

Posts, Replies, and Media filter the currently loaded timeline. Search is also
limited to loaded posts and does not trigger paid search API requests. Long posts
expand in place. Photos and video preview images retain their source attribution;
video playback opens the original X post. Read-only counts are shown only when
returned by the API, without pretend like/repost buttons or a fake verified badge.
Sensitive previews require an explicit reveal. Text and links are rendered without
HTML injection; media URLs are restricted to known X image hosts.

Missing credentials, denied authentication, billing restrictions, rate limits,
timeouts, malformed responses, and empty timelines have distinct recovery states.
Errors never include the raw upstream response or secret-bearing request headers.
The public profile link remains available when the API is unavailable.

## Validation

Use Node 24 and the committed Yarn version:

```sh
corepack enable
yarn install --immutable
yarn lint
yarn typecheck
yarn test --coverage --maxWorkers=2
yarn build
yarn export
yarn playwright install --with-deps chromium firefox webkit
yarn build
yarn playwright test --config=playwright.portfolio.config.ts
```

Unit coverage includes public-only normalization, URL safety, OAuth signing,
credential completeness, bounded pagination, expiry, cache behavior, permission
changes, timeouts, error sanitization, route validation, app lifecycle, and both
entry points. Browser scenarios exercise portrait, short landscape, desktop,
maximization, native close/reopen, filtering, pagination, errors/retry, screenshot
capture, and scoped axe checks in Chromium, Firefox, and WebKit. These scenarios
use controlled API fixtures and are not proof of live account credentials, quota,
or API availability. Validate a successful `/api/x/profile` response separately
after configuring a fresh credential in Vercel.

The changed-file lint selector also uses the actual before/after range on a GitHub
push. It no longer falls through from current `origin/main` to an obsolete
`origin/master`, which incorrectly pulled unrelated legacy files into the release
gate. Strict zero-warning checks remain on every changed lintable file; full-tree
legacy lint debt is not represented as fixed by this scoped release.

## API references

- [User timeline](https://docs.x.com/x-api/users/get-posts)
- [App-only Bearer Tokens](https://docs.x.com/fundamentals/authentication/oauth-2-0/bearer-tokens)
- [X Activity API](https://docs.x.com/x-api/activity/introduction)
