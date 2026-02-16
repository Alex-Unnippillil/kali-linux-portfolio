# React2Shell (CVE-2025-55182) Mitigation Plan

## Context
- Stack: Next.js 15.5.9 with React/ReactDOM 19.1.1 (treated as affected until patched).
- Risk: Crafted payloads may survive server-side rendering and hydrate into executable client behavior.
- Release posture: Freeze releases until patched upstream packages ship and validation passes.

## Upgrade plan
1. When patched versions are published, bump **next**, **react**, **react-dom**, **@next/bundle-analyzer**, and **eslint-config-next** together so the Yarn lockfile stays consistent.
2. Regenerate the lockfile and rerun `yarn install`.
3. Execute the full suite before shipping:
   - `yarn lint`
   - `yarn test`
   - `yarn build`
   - `yarn export` (static path)
4. Smoke-test HTML-rich apps (Autopsy, Ettercap, ASCII Art, Tweet embed, Help panel) to confirm hydration is benign and UI stays stable.
5. Publish release notes summarizing the upgrade and validation coverage.

## Hardening before patches land
- Sanitize or escape any string that reaches the DOM; default to plain text when possible.
- Prefer build-time caching of external data over runtime fetches; keep runtime fetches sanitized.
- Review CSP and sandbox headers to ensure iframes/scripts stay restricted to necessary origins.
- Avoid introducing new `dangerouslySetInnerHTML` usages until patched releases are verified.

## Current HTML entry points to audit
The following components intentionally inject HTML and should be re-verified against the React2Shell vector. Many already escape or sanitize inputs, but they remain the primary hydration surfaces:

| Location | Source of HTML | Current mitigation notes |
| --- | --- | --- |
| `components/tweet-embed.js` | Twitter syndication HTML | Sanitized via DOMPurify; adds rel/target restrictions on links. |
| `components/HelpPanel.tsx` | Markdown fetched from `/docs/apps/*.md` | Parsed with `marked` and sanitized with DOMPurify before injection. |
| `components/apps/openvas/index.js` | Local fixture descriptions | Escaped with `escapeHtml` before insertion. |
| `components/apps/autopsy/KeywordSearchPanel.js` | Local artifact metadata | Escapes HTML and wraps keyword matches in `<mark>`. |
| `components/apps/autopsy/index.js` | Case announcements and filenames | Uses escaped strings for announcements and filenames. |
| `apps/autopsy/components/KeywordTester.tsx` | Keyword highlight preview | Escapes content before applying `<mark>` tags. |
| `components/apps/ascii_art/index.js` | Locally generated ASCII HTML view | Derived from user typing or canvas sampling; keep escape routines intact when refactoring. |
| `components/apps/ettercap/index.js` | Filter highlighting | Highlight helper escapes and wraps matches. |
| `components/apps/About/index.tsx` | JSON-LD script tag | Uses `JSON.stringify` with CSP nonce. |
| `components/SEO/Meta.js` | Structured data script tag | Uses `JSON.stringify` with CSP nonce. |

## Operational checklist until fixed
- Block production deploys unless they contain the official patch and pass the validation suite above.
- Treat any new feature work as behind a feature flag until the framework update is complete.
- Re-run the HTML audit after upgrading to confirm no additional injection points were introduced.
