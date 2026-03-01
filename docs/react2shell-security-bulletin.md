# React2Shell Security Bulletin (CVE-2025-55182)

## Overview
React2Shell (CVE-2025-55182) is a newly disclosed critical vulnerability affecting React, Next.js, and related frameworks. Early reports indicate it enables remote code execution through crafted payloads that survive server-side rendering and hydrate into executable client behavior. This portfolio runs on Next.js 15.5.9 with React 19.1.1, so we must treat the stack as affected until patched releases ship.

## Immediate response actions
- **Freeze releases until patched versions are available and verified.** Avoid deploying new builds without the fix to limit exposure.
- **Prepare dependency upgrades the moment upstream patches land.** Plan to bump `react`, `react-dom`, `next`, and companion packages such as `@next/bundle-analyzer` and `eslint-config-next` together so the lockfile remains consistent.
- **Run the full validation suite after upgrading.** At minimum run `yarn lint`, `yarn test`, `yarn build`, and (when relevant) `yarn export` to verify both serverful and static-export paths stay stable.
- **Audit untrusted HTML rendering.** Components that intentionally use `dangerouslySetInnerHTML` (e.g., Autopsy keyword highlighting, Tweet embed, Help panel, Ettercap filter view, ASCII art renderer) should be reviewed to confirm inputs remain locally sourced, escaped, or sanitized before rendering.

## Hardening steps while waiting for patches
- **Sanitize any user-provided strings rendered into the DOM.** Prefer escaping content or filtering markup to plain text wherever possible.
- **Limit feature surface area for untrusted content.** If a component renders data pulled from external sources, cache and sanitize it during build time rather than at runtime.
- **Review Content Security Policy and sandboxing headers.** Ensure iframe embeds, scripts, and worker contexts are restricted to the minimum origins required for the desktop experience.

## Rollout checklist once patches ship
1. Upgrade React and Next.js dependencies to the patched versions and regenerate the Yarn lockfile.
2. Run `yarn lint && yarn test && yarn build` (and `yarn export` if shipping the static build) to catch regressions.
3. Smoke-test apps that render dynamic or HTML-rich content to confirm hydration no longer executes untrusted payloads.
4. Publish release notes describing the upgrade and the validation performed.
