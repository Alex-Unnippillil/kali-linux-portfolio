# Contributing

Welcome! This document collects the onboarding steps that internal contributors follow when working on the Kali Linux portfolio.
It mirrors the automation running in CI so you can reproduce the same checks locally.

## 1. Environment setup

1. Install the Node version defined in `.nvmrc`. We recommend using `nvm`:
   ```bash
   nvm install
   nvm use
   ```
2. Install dependencies with Yarn 4 (the repo is configured for Plug'n'Play via `corepack`):
   ```bash
   yarn install
   ```
3. Create a local environment file if you need to exercise features that require keys:
   ```bash
   cp .env.local.example .env.local
   ```
   Populate only the variables you plan to use. Most routes—including the new design system (`/design`)—work without network
   access or secrets.

## 2. Daily workflow

- Start the development server:
  ```bash
  yarn dev
  ```
  The desktop shell boots at <http://localhost:3000>. Use the settings menu to toggle themes, density, and accessibility modes
  while developing; the design system mirrors these controls.
- Keep an eye on the terminal for ESLint or TypeScript diagnostics emitted during compilation.
- When you add UI that mimics the Ubuntu/Kali chrome, import the shared components from `components/ubuntu.js` (e.g.
  `components/screen/navbar`, `components/util-components/background-image`) instead of duplicating markup.

## 3. Required checks

Before opening a pull request make sure the following scripts succeed:

```bash
yarn lint
yarn test
```

If you touched code that affects smoke flows, also run:

```bash
yarn smoke
```

Playwright end-to-end tests are optional locally but run in CI:

```bash
npx playwright test
```

## 4. Design system notes

- `/design` is a static-first route—avoid adding API calls or remote fetches.
- Theme tokens are loaded at runtime. If you introduce new variables add them to `styles/tokens.css` and the loaders in
  `data/design-system/tokens.ts`.
- Use the shared `CopyButton` component (`components/util-components/CopyButton`) for clipboard affordances.
- Update `docs/CHANGELOG.md` or feature-specific docs when you ship something user-facing.

## 5. Pull request checklist

- [ ] Tests and lint pass locally.
- [ ] No secrets or personal data in the diff.
- [ ] UI follows accessibility expectations (keyboard, focus, reduced motion).
- [ ] Screenshots or clips attached for visible changes.
- [ ] PR description lists flags toggled and relevant routes.

Thanks for contributing! If you get stuck, open an issue or tag the maintainers in the Discord workspace.
