# Dependency Policy

This document explains how we choose version ranges for dependencies and how to review
Renovate pull requests. The goal is to let low‑risk updates land with minimal friction
while protecting the build from unexpected breaking changes.

## Version Range Strategy

We use two range styles in `package.json`:

### Use caret (`^`) ranges when

- The package follows SemVer (v1.0.0 or later) and has a track record of backwards‑compatible
  patch/minor releases.
- The library is **not** part of the core build toolchain (no direct impact on
  the Next.js/React runtime, bundling, or TypeScript transpilation).
- The package is easy to roll back because it only affects isolated features
  (for example UI widgets, analytics clients, most hooks/helpers).
- The dependency is primarily consumed in the browser and ships prebuilt assets
  that do not require a Node.js build step.

Caret ranges let Renovate keep us on the latest compatible patch/minor release.
Renovate is configured to automerge these patch updates once CI passes.

### Use exact pins when

- The package is part of the critical runtime or build chain (Next.js,
  React/React DOM, TypeScript, Webpack, PostCSS/Tailwind, Jest/ESLint, Playwright).
- The package provides CLI/build tooling that historically ships breaking changes
  even in minor releases.
- The package is pre‑1.0 or does not follow SemVer.
- A downstream asset depends on a specific version (for example data files that
  must match a binary format).

Exact pins ensure Renovate opens a focused PR that we can schedule, test, and
coordinate with deployment windows. Renovate applies a `manual-review` label to
these updates so they are easy to triage.

### Adding or adjusting dependencies

1. Decide whether the dependency is runtime/build critical. Default to an exact
   pin when uncertain, then revisit after a few release cycles.
2. Prefer caret ranges for UI helpers and utility libraries that can accept
   SemVer patch/minor upgrades.
3. Avoid broad ranges like `*` or `latest`; they bypass Renovate’s safety rails.
4. When switching a package from caret to an exact pin (or vice versa), update
   this policy if the change represents a new category of dependency.

## Triage Process for Renovate Updates

Renovate runs continuously and respects this policy:

- Patch updates for caret ranges can automerge once CI finishes.
- Framework/toolchain updates stay open for humans, carry the `manual-review`
  label, and never automerge.
- Type definition packages (the `@types/*` family) are grouped so we can test
  them alongside the TypeScript compiler version they target.

Follow this checklist when Renovate proposes an update:

1. **Read the release notes and changelog** linked in the Renovate PR. Look for
   breaking changes, migration steps, or Node.js version bumps.
2. **Run the verification suite locally**: `yarn lint`, `yarn test`, and
   `yarn build`. For UI or framework updates also run the smoke crawler
   (`yarn smoke`) against a `yarn dev` server.
3. **Validate critical workflows** manually if the change touches rendering,
   routing, asset bundling, or simulated tool APIs.
4. **Stage the update** by deploying to the preview environment or a staging
   branch when the change affects infrastructure (Next.js, React, build tools).
5. **Document decisions** in the PR. If an update is blocked, leave a comment
   summarizing the issue and create a follow‑up task if needed.

## Responding to Risky Upgrades

For upgrades that fail testing or carry breaking migrations:

- Convert the Renovate PR to draft and add details about the failure.
- File an issue describing the blocker and potential remediation steps.
- If the breakage comes from a caret dependency, consider temporarily pinning it
  until we have a fix.
- Coordinate with maintainers before merging framework/toolchain upgrades near a
  release window.

Keeping this policy up to date ensures automated tooling and human reviews stay
aligned.
