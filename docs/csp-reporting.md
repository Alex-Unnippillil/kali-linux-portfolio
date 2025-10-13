# Content Security Policy reporting checklist

This document captures the mitigation plan for the stricter CSP introduced in
`middleware.ts`. The policy now relies on nonces for runtime scripts and styles
and drops the legacy `unsafe-inline` escape hatch.

## How to exercise the report-only phase locally

1. Start the development server with `yarn dev`.
2. Visit a few desktop apps (for example `/apps/metasploit`,
   `/apps/reaver`, and `/apps/ghidra`).
3. Inspect the Network tab for the main document response. You should see both
   the `Content-Security-Policy` and
   `Content-Security-Policy-Report-Only` headers, along with a `Report-To`
   configuration that points to `/api/csp-report`.
4. Trigger a violation (for example by opening DevTools and injecting an inline
   `<script>` in the console). The server logs will include the structured
   warning emitted by `pages/api/csp-report.ts` once the browser posts the
   report payload.

## Known violations to address before strict enforcement

- **Inline style attributes.** Many components still rely on `style={{ … }}`
  declarations for layout tweaks. Browsers will report these as `style-src`
  violations because the enforcement policy only trusts styles that carry the
  generated nonce. We should migrate the affected components to utility
  classes (for example Tailwind) or move the rules into static stylesheets that
  load from `self`.
- **Legacy third-party embeds.** Audit any iframe or script embed that is not
  covered by the curated allowlist in `middleware.ts`. During the report-only
  phase, update or remove integrations that trigger repeated violations.

## Operational playbook

- Review the server logs for `CSP violation reported` messages during the
  report-only period. Each entry includes the offending directive, the blocked
  URL, and the user agent so we can reproduce the issue.
- Once inline style usage has been removed (or justified behind feature flags)
  and no other third-party domains appear in the reports, drop the report-only
  header to fully enforce the policy.
- If a partner service must remain, update the directive allowlists explicitly
  instead of widening the policy with wildcards.
