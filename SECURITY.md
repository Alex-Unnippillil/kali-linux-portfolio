# Security Policy

## Content Security Policy

External origins allowed:
- https://vercel.live
- https://platform.twitter.com
- https://syndication.twitter.com
- https://cdn.syndication.twimg.com
- https://*.twitter.com
- https://*.twimg.com
- https://*.x.com
- https://www.youtube.com
- https://www.youtube-nocookie.com
- https://www.google.com
- https://www.gstatic.com
- https://*.googleapis.com
- https://sdk.scdn.co
- https://cdn.jsdelivr.net
- https://cdnjs.cloudflare.com
- https://stackblitz.com
- https://open.spotify.com
- https://ipapi.co
- https://react.dev

The middleware sets a per-request nonce and enforces:
```
default-src 'self';
img-src 'self' https: data:;
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
script-src 'self' 'nonce-<nonce>' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
connect-src 'self' https://example.com https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://*.googleapis.com https://stackblitz.com https://ipapi.co;
frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
```

## HTTP Headers

Configured in `next.config.js` for all pages:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## Input Sanitization

User-supplied content in Sticky Notes and Gedit is sanitized with DOMPurify before being stored or rendered. Tests verify that script injection attempts have no effect.

## Verification

1. `yarn lint`
2. `yarn test`
3. In a running app, check response headers and confirm `nonce` appears on script tags.
