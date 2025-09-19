# Contributing Guide

This guide explains how to set up the project, follow the workflow, and pass the quality gates that keep the Kali Linux Portfolio healthy. It complements [`AGENTS.md`](./AGENTS.md) and the documents in [`docs/`](./docs/).

## Quick start from a fresh clone

1. **Install prerequisites**
   - Node.js **20.19.5** (`nvm install && nvm use` will read `.nvmrc`).
   - [Corepack](https://nodejs.org/api/corepack.html) with Yarn **4.9.2** (`corepack enable`).
   - Git and a POSIX shell.
2. **Clone and enter the repo**
   ```bash
   git clone https://github.com/Alex-Unnippillil/kali-linux-portfolio.git
   cd kali-linux-portfolio
   ```
3. **Bootstrap dependencies**
   ```bash
   corepack prepare yarn@4.9.2 --activate  # optional; preinstall script does this automatically
   cp .env.local.example .env.local        # fill values for any feature you exercise
   yarn install
   ```
4. **Run quality checks before coding**
   ```bash
   yarn lint
   yarn test
   ```
5. **Run the smoke crawler (requires the dev server in another terminal)**
   ```bash
   yarn dev
   # in a second terminal
   yarn smoke
   ```
6. **(Optional) Build variants**
   ```bash
   yarn build && yarn start        # serverful production build
   yarn export && npx serve out    # static export for Pages / S3
   ```

## Development workflow

### Branching strategy

- Keep `main` releasable. Create feature branches from `main` using `feature/<short-description>` or `fix/<issue-id>` naming.
- Rebase or merge `main` frequently to avoid large divergence.
- Keep commits focused on a single concern with descriptive messages.

### Scripts you will use often

| Goal | Command |
| --- | --- |
| Start dev server | `yarn dev` |
| Type-check isolated utilities | `yarn tsc` or `yarn typecheck` |
| Lint the entire repo | `yarn lint` |
| Run unit tests | `yarn test` |
| Launch smoke crawler | `yarn smoke` (requires `yarn dev` in another terminal) |
| Accessibility sweep | `yarn a11y` |
| Build for production | `yarn build` |
| Serve production build | `yarn start` |
| Static export | `yarn export` |
| Playwright E2E (if configured locally) | `npx playwright test` |

See [`package.json`](./package.json) for the complete list.

### Coding standards

- Follow the repo ESLint configuration (`yarn lint` must pass with zero warnings).
- Prefer functional React components and keep imports relative within a feature area.
- Co-locate lightweight assets; place large static files under `public/`.
- Do not hardcode secrets. Feature-flag integrations with environment variables (see `.env.local.example`).
- Keep simulated security tools non-destructive. Never add code that runs real scans or attacks.
- Add or update tests near the code you modify.

### Environment notes

- Populate `.env.local` with only the keys required for the feature under test. Leave unused keys blank.
- Toggle simulated APIs with `FEATURE_TOOL_APIS`. In static builds (`yarn export`) fall back to demo data.
- Analytics (`NEXT_PUBLIC_ENABLE_ANALYTICS`) are disabled by default; enable only when validating telemetry.

## Reviews and CI expectations

- Before opening a pull request, run:
  ```bash
  yarn lint
  yarn test
  yarn smoke   # with yarn dev running
  ```
  Run `npx playwright test` when your change affects flows covered by Playwright.
- Include any new or updated screenshots when you change UI.
- Update documentation when you add feature flags, apps, or commands.
- GitHub Actions will run linting, tests, and build/export tasks. Fix failures locally before re-requesting review.
- Keep the PR description concise with the area prefix (`[area] short summary`) and list the checks you ran.

## Additional references

- [Project README](./README.md) – high-level overview, setup, and environment details.
- [`docs/getting-started.md`](./docs/getting-started.md) – quick orientation for new contributors.
- [`docs/architecture.md`](./docs/architecture.md) – file layout and system design.
- [`docs/new-app-checklist.md`](./docs/new-app-checklist.md) – requirements when introducing a new desktop app.
- [`docs/tasks.md`](./docs/tasks.md) – backlog of planned enhancements.

Welcome aboard! Feel free to open draft PRs early to get feedback on large features.
