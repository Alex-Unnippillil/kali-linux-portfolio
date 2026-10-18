# Dependency security verification

Run `yarn test:dependency-security` and `yarn audit:security` after an immutable
install. CI runs both commands and uploads the raw registry output and decision
in the `dependency-audit` artifact. The threshold remains **high and critical**.
Network failures, malformed responses, changed mitigation evidence, or other
high/critical findings fail the gate.

## Published dependency updates

The 2026-10-18 update resolves the audited tree to:

- `figlet` 1.12.0, after its 1.11.3 security fix and 1.11.4 ESM correction.
- `sharp` 0.35.5, including prebuilt librsvg 2.63.2.
- `source-map-js` 1.2.2.
- `http-cache-semantics` 4.3.0, outside the advisory's `<=4.2.0` affected range.
  The maintainer disputes this advisory; 4.3.0 is not identified as a patched
  release in its advisory metadata. This dependency is used by `node-gyp` through
  `make-fetch-happen`, not as this application's shared HTTP cache.

References: [figlet advisory](https://github.com/advisories/GHSA-62ch-8vmq-8xm7),
[sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
[source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
[http-cache-semantics advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp),
and [the maintainer's response](https://github.com/kornelski/http-cache-semantics/issues/56).

## Temporary braces 3.0.3 backport

There is no published fixed `braces` release for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
as of 2026-10-18. The package retains its real version, 3.0.3. Its registry
advisory remains open and is **not** reported as a clean npm audit.

The checked-in Yarn patch adapts the depth-guard approach in
[upstream PR #87](https://github.com/micromatch/braces/pull/87), with additional
parent-chain, queue-array, and malformed leaf-value checks. It is a local,
reviewed mitigation, not an upstream release or maintainer-approved fix.
The existing MIT license remains in the installed package.

The patch caps combined brace/parenthesis nesting and recursive AST/array
processing at 100, detects expansion parent cycles, and rejects non-string
leaf values before compile/stringify coercion. Both installed consumers,
`micromatch` and `chokidar`, must resolve the verified copy.

This deliberately rejects extremely nested patterns with controlled
`SyntaxError`/`RangeError`, and malformed leaf values with `TypeError`.
Callers must handle validation errors. It does not promise protection from
Cartesian expansion, generated regular-expression backtracking, huge flat
inputs, arbitrary getters/proxies, or all malformed JavaScript objects.
Normal patterns, ranges, escaping, and micromatch integration are covered by
regressions. Initial validation also compared 1,083 results/errors against the
unmodified package and confirmed the original stack-exhaustion negative control.
CI runs the bounded-depth and integration groups in isolated, time-limited Node
processes with a reduced stack.

### Exact, fail-closed audit treatment

Yarn 4.9.2 omits `patch:` locators from the npm audit inventory. The gate therefore
also submits **every npm source behind a locked patch**, including Yarn's built-in
compatibility patches, to the official npm bulk-advisory endpoint. Unknown patch
source formats fail rather than silently disappear from the inventory.

Only this exact braces advisory can produce `PASS_WITH_VERIFIED_BACKPORT`:

- npm advisory ID `1240992`, exact GHSA URL and issue title
- source version `3.0.3`, severity `high`, affected range `<=3.0.3`
- exact reviewed patch artifact, locator, package identity and source-file hashes
- both manifest overrides and all locked descriptors still protected
- every installed braces copy matches Yarn's install-state inventory
- every installed consumer resolves a verified copy
- focused regression tests pass

Any other high/critical advisory blocks, including a new advisory for braces or
another Yarn-patched package. Package/advisory exclusions are rejected. Raw Yarn
and supplemental npm responses remain visible in `dependency-audit.log`; the
summary explicitly names the remaining registry advisory. Unit tests exercise
changed advisory identity, missing/altered code, unexpected copies, changed
resolutions, new findings, malformed responses, and audit failures.

### Removal

When an official fixed release is available, review and update the consumers,
remove both resolutions and the patch, and replace the temporary verifier/gate
with an audit that still covers all installed packages. Run the regression,
application, build, and audit checks before removing the exception. Do not update
hashes or broaden the advisory match merely to make a failing check pass.
