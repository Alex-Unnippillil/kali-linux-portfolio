# Permissions-Policy hardening

The portfolio denies access to high-risk browser capabilities by default using the
[`Permissions-Policy`](https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy)
header. Only vetted routes that need camera, microphone, or geolocation access may
request exceptions.

## Default policy

The base header is defined in `lib/security/permissions-policy.js` and applied by both
Next.js middleware and the production server configuration:

```
camera=(), microphone=(), geolocation=()
```

All routes inherit this restriction unless explicitly listed in the override table
below. Middleware also injects the header during development so the behaviour stays
consistent across environments.

## Approved overrides

| Route pattern | Granted policy | Reason |
| --- | --- | --- |
| `/apps/qr/:path*` | `camera=(self), microphone=(), geolocation=()` | QR code scanner demo needs camera access for live preview. |

Overrides live in `lib/security/permissions-policy.js`. Each entry documents why the
exception exists so reviewers can confirm it remains justified.

## Requesting a new exception

1. **Document the need.** Open an issue describing the user journey and why the
   capability is essential. Include screenshots or recordings if it touches the UI.
2. **Propose mitigations.** Outline how the feature avoids storing raw media, how the
   UI warns users, and any fallbacks when permission is denied.
3. **Update the configuration.** Add a new override in
   `lib/security/permissions-policy.js`, ensuring the `source` matches the route and
   the `matcher` RegExp mirrors it for middleware. Extend the automated tests in
   `__tests__/permissions-policy.test.ts` to cover the new route.
4. **Refresh documentation.** Update this file and any affected app docs to call out
   the new capability requirement.
5. **Run audits.** Execute the security and performance checks that validate headers
   are emitted, for example `yarn lint`, `yarn test`, and the Lighthouse stage in
   `yarn verify`. Capture Lighthouse (or other security scanner) reports showing the
   permissions policy passes with the new override in place.
6. **Submit for review.** Reference the audit artefacts and test output in the pull
   request so reviewers can verify compliance quickly.

Routes without an explicit override will continue to receive the locked-down default
policy, preventing regressions if new pages are added without an explicit decision.
