# Contributing

## Running locally
1. Install dependencies with `yarn install`.
2. Start the development server using `yarn dev`.
3. Run unit tests with `yarn test`.
4. Execute Playwright tests with `npx playwright test`.
5. Smoke test all app routes via `yarn smoke`.

## Continuous Integration
The CI pipeline runs `yarn verify:all`, which now also executes `yarn smoke` to load every `/apps/*` route headlessly and fail on runtime errors.
