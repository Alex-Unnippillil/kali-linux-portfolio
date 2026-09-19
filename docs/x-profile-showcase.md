# X profile showcase

The desktop X app and `/apps/x` display only `@AUnnippillil`. Both open
immediately, without asking visitors to enable networking, log in, supply keys,
or confirm an embedded website. The app is native React, not an X iframe.

## Saved posts: no API needed

`data/x-profile-snapshot.json` is the reviewed public selection. When it contains
a valid feed, the app renders it synchronously and makes **no automatic X API
request**. It works in the static export too. The interface labels the selection
with its capture date and says it is not live. Original text, dates, IDs and
links are retained. Unknown engagement counts are omitted, not invented.

**Published selection:** 18 original public posts from account `185897765`
(`@AUnnippillil`), captured on September 18, 2026 at 22:08 UTC through the
FxEmbed public read API. The initial Posts view contains 17 posts; Replies
contains one self-reply; Media contains three photo posts, including a photo-only
post. Two timeline reposts authored by other accounts are excluded. No posts or
engagement counts were invented. `data/x-profile-provenance.json` records original
post links, capture time, retrieval hashes and the sources of all five local
image assets (avatar, banner and three attached photos).

The published app does not contact FxEmbed, X, an image CDN, or the optional
live API when opened. It does not offer a live-refresh button for the saved
selection. Images are served from this site; external original links require
an explicit click. Tests exercise both this actual production snapshot and
separately identified synthetic fixtures for optional API failure handling.

### Import an owner-reviewed X archive

Download the account's archive from X. Keep it **outside the repository**. The
importer only reads the two named files and, optionally, the named media folder.
It never reads DMs, contacts, account email into the output, or the entire archive
recursively. An archive can contain historical content you no longer wish to
publish. Review the selection and use `--ids` to select specific originals.

```sh
yarn x:import \
  --account /private/x-archive/data/account.js \
  --tweets /private/x-archive/data/tweets.js \
  --media /private/x-archive/data/tweets_media \
  --ids 1234567890123456789,1234567890123456790 \
  --publish-reviewed
```

The example IDs are placeholders, not claimed account posts. Omit `--ids` to
import up to 100 newest original posts from the supplied file. Omit `--media` for
a text-only selection. The `--publish-reviewed` flag confirms the **owner's
publication decision**, not a visitor confirmation step. Nothing is uploaded by
this command: review its generated JSON/media, then commit those files normally.

The importer verifies the account handle and numeric account ID. It parses the
archive assignment as JSON data without `eval`, excludes reposts and withheld
entries, deduplicates IDs, and rejects malformed inputs without replacing the
existing snapshot. Optional raster-image previews are copied from the explicit
local archive directory to hashed first-party paths. No remote image download
or script embedding occurs. File and media budgets are enforced. Unsupported
or missing previews are omitted; videos link to their originals on X.

Commit only `data/x-profile-snapshot.json` and its intended files under
`public/showcase/x-media/`. Never commit `account.js`, `tweets.js`, the raw
archive, keys, tokens or secrets. Delete unused old media when removing posts.
Saved selections do not automatically notice a deleted post or a protected
account: the owner must remove or refresh the selection and redeploy.

## Optional server retrieval

Without a saved selection, the app automatically tries the same-origin
`GET /api/x/profile` once. The existing server implementation resolves only the
fixed public profile and uses X's user-post timeline. A visitor never receives
account credentials. Configure either a server-only `X_BEARER_TOKEN`, or all
four OAuth1 values: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and
`X_ACCESS_TOKEN_SECRET`. An access-token/token-secret pair alone is not enough.
Rotate previously exposed credentials; do not paste replacements into chat or
public source. No billing or X access tier is changed by this implementation.

The API keeps signed expiring cursors, a five-page/100-post bound, timeout and
response budgets, coalescing, a 15-minute cache, and error cooldowns. It rejects
protected or withheld profiles. Browser API responses are not put into the
service-worker cache. Static export never requests the unavailable API.

The API-only fallback offers manual refresh; the saved showcase does not.
A failed API refresh retains any previously loaded selection. Errors expose neither raw upstream responses nor secrets.
Replies, Media and search filter loaded content locally. Engagement counts are
informational; posting, liking, following, and replying happen on X through
explicit original links. Sensitive media retains its individual reveal control.

No global privacy preference or unrelated application's confirmation is changed.
Saved media comes only from this site. The optional API may return images from
X's image CDN; outbound original links remain explicit user actions.
