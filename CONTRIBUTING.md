# Contributing

## Running locally

```bash
yarn install
yarn dev
```

In another terminal run the full check suite:

```bash
yarn lint
yarn typecheck
yarn test
npx playwright test
yarn smoke
```

`yarn smoke` requires a dev server listening on `http://localhost:3000` and loads each `/apps/*` route headlessly to ensure there are no runtime errors.

## Continuous Integration

The CI workflow runs linting, type checks, unit tests, Playwright end-to-end specs and the smoke suite. To emulate CI locally run:

```bash
yarn lint && yarn typecheck && yarn test && npx playwright test && yarn smoke
```
