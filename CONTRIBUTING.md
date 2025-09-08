# Contributing

## Local Development

1. Install dependencies with `yarn install`.
2. Start the dev server: `yarn dev`.
3. Run unit tests: `yarn test`.
4. Run Playwright tests (requires the server):
   ```sh
   yarn dev &
   npx wait-on http://localhost:3000
   npx playwright test
   ```
5. Smoke-test all app routes headlessly: `yarn smoke`.

## Continuous Integration

CI runs the following checks:

- `yarn lint`
- `yarn typecheck`
- `yarn test`
- `npx playwright test` (including `yarn smoke`)

Please ensure these commands pass before opening a pull request.
