# Preview Verification Checklist

Use this checklist to validate local, CI, and Vercel Preview behavior.

## Local verification

1. Install dependencies with the locked Yarn version:

```bash
corepack enable
yarn install --immutable
```

2. Build and start the serverful app:

```bash
yarn build
yarn start
```

3. Visit the following routes and confirm they load without errors:

- `/`
- `/apps`
- `/apps/terminal`
- `/apps/checkers`
- `/apps/weather`

4. Validate API routes (serverful build only):

```bash
curl -X POST http://localhost:3000/api/dummy
curl -X GET "http://localhost:3000/api/youtube/directory"
curl -X GET "http://localhost:3000/api/youtube/playlist-items?playlistId=PLACEHOLDER"
```

Expected results:
- `/api/dummy` returns a JSON response with `ok: true`.
- YouTube API routes should return `503` with a clear error message if the API key is not configured.

## CI verification

- The PR workflow should pass `lint`, `typecheck`, `test`, and `security` jobs.

## Vercel Preview verification

- A PR should produce **one** successful Preview deployment.
- A `gh-pages` update should **not** create a failing Preview deployment (it should be skipped by the ignored build step).
- The preview site should load `/` and `/apps/*` routes without 500 errors.
