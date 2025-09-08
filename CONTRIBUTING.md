# Contributing

## Running locally
1. Install dependencies:
   ```bash
   yarn install
   ```
2. Start the development server:
   ```bash
   yarn dev
   ```

## Tests
- **Unit tests**:
  ```bash
  yarn test
  ```
- **E2E tests**:
  ```bash
  yarn dev &
  npx wait-on http://localhost:3000
  npx playwright test tests/e2e
  ```
- **Smoke tests**:
  ```bash
  yarn dev &
  npx wait-on http://localhost:3000
  yarn smoke
  ```

## CI
GitHub Actions runs linting, type checks, unit tests, Playwright E2E tests, and the smoke test (`yarn smoke`).
