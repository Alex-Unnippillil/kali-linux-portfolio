# Build caching

The repository uses [Turborepo](https://turbo.build/) to orchestrate linting, tests, and production builds. Turbo stores cache
artifacts in the local `.turbo/` directory and can optionally push or pull results from a remote cache.

## Local development

- Run tasks through Turbo to benefit from caching:
  ```bash
  yarn turbo run lint
  yarn turbo run test -- --coverage
  yarn turbo run build
  ```
- The cache is enabled by default. To bypass it for a single run, add `--no-cache` or use the `--force` flag to recompute the
  task results.
- Clear the local cache with `rm -rf .turbo` if you need to reset state. You can also relocate it by exporting
  `TURBO_CACHE_DIR=/custom/path` before running commands.

## Remote caching options

### Vercel Remote Cache

1. Generate a token with `yarn turbo login` or the Vercel dashboard.
2. Store `TURBO_TEAM` and `TURBO_TOKEN` in your local shell (or CI secrets). Turbo will automatically reuse the remote cache
   when both variables are present.
3. Optionally set `TURBO_REMOTE_CACHE_SIGNATURE_KEY` to validate cache artifacts.

### GitHub Actions cache

The `ci.yml` workflow restores and saves `.turbo/` using `actions/cache@v4`. Cache keys combine the operating system,
`turbo.json`, `.turboignore`, `package.json`, and `yarn.lock`, so updating any of those files will invalidate stale artifacts.

## Observing cache health

- Turbo prints a summary with cache hits and misses when `--summarize` is supplied. CI jobs use this flag so you can review hit
  rates directly from workflow logs.
- Adjust the patterns in `.turboignore` if content changes that should not affect builds are invalidating the cache.
- Keep an eye on large environment-dependent features. Any value listed under `globalEnv` in `turbo.json` will be hashed as part
  of the cache key, so updates to feature flags or API keys may legitimately invalidate caches.
