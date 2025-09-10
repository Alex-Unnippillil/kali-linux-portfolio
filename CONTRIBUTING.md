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

## Lint
- Run ESLint before committing:
  ```bash
  yarn lint
  ```
- `.mdx` files must not be imported in code.

## Type debt
Document any temporary type suppressions (for example `@ts-ignore`, `@ts-expect-error` or `any` casts) in [docs/type-debt.md](docs/type-debt.md) with the location, owner, justification and a target removal date.

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
