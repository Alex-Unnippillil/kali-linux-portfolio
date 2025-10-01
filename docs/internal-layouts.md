# Internal Layouts

This project provides Tailwind utilities that mimic Bootstrap's 12-column grid. Use them to create internal layouts without relying on Bootstrap itself.

## Usage

Wrap columns in a flex container and apply the `col-*` classes to control widths.

```html
<div class="flex flex-wrap">
  <div class="col-6">Left</div>
  <div class="col-6">Right</div>
</div>
```

Offsets are also available through `offset-*` classes.

```html
<div class="flex flex-wrap">
  <div class="col-4 offset-4">Centered</div>
</div>
```

## Deep links

App routes now accept a versioned deep-link format so shortcuts and external
launchers can request specific windows. The query string schema is validated by
`utils/deeplink.ts` using Zod to ensure malformed input cannot crash the page.

### Format

```
?v=1&open=<app-id>[&fallback=open-closest][&ctx=<url-encoded JSON>]
```

* `v` – Deep-link version. Only `1` is supported at the moment. Any other value
  triggers a rescue screen with a friendly error.
* `open` – The requested application ID. This must match an ID from
  `apps.config.js` (for example `terminal`, `wireshark`, or
  `mimikatz/offline`).
* `fallback` – Optional. Set to `open-closest` to allow the router to pick the
  nearest matching application when the requested ID does not exist. If omitted
  the lookup requires an exact match.
* `ctx` – Optional JSON payload describing extra context for the destination.
  It must be URL-encoded JSON (for example `%7B%22path%22%3A%22logs%22%7D`).

Pages wrapped with `withDeepLinkBoundary` (used across `pages/apps/*`) or
created via `createDeepLinkPage` will surface a rescue view whenever validation
fails or the resolved app does not match the current route. When a fallback
succeeds, the page still loads normally and receives the parsed payload via the
optional `deepLink` prop.
