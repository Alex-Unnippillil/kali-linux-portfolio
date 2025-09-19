# Contributing

Thanks for taking the time to work on the Kali Linux Portfolio project! This guide outlines the tooling expectations and a key policy you should follow before opening a pull request.

## Tooling basics

- Use the Node.js version declared in `.nvmrc`.
- Use Yarn 4 (provided via Corepack). Install dependencies with `yarn install --immutable` so the lockfile and metadata remain reproducible.
- Run the project checks documented in `AGENTS.md` (`yarn lint`, `yarn test`, optional smoke/E2E suites) before submitting changes.

## No build-in-install policy

To keep installs fast and deterministic:

- Do **not** add `postinstall`, `prepare`, or other install-time hooks that compile TypeScript, bundle assets, or emit artifacts.
- Keep build steps inside explicit scripts such as `yarn build`, `yarn build:gamepad`, or dedicated tooling commands.
- If a dependency requires generated files, commit them to the repo or trigger generation in a build or CI script instead of relying on install-time hooks.

A CI guard now runs `yarn install --immutable` and fails if `git status` reports any modified files afterward. If that job fails, move the offending generation to a build script or commit the artifacts so installs remain clean.

Following this policy ensures every contributor's install produces identical results and that build outputs are controlled by intentional commands.
