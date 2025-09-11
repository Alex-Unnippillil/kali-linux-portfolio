# Agent

> **Security Policy: simulations only.** All tasks take place in the development environment and must not interact with real-world systems or data.

## Mission boundaries
- Operate strictly within this repository and development container.
- Internet use is limited to fetching dependencies and documentation.
- Report unclear instructions; avoid assumptions.

## Setup
```bash
corepack enable
yarn install
```

## Environment variables
| Variable | Purpose | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_STATIC_EXPORT` | Enables static export during build | no |
| `API_URL` | Backend API endpoint | yes |

## Quality gates
```bash
yarn lint
yarn typecheck
yarn test
```

## Architecture
- Next.js 15 and React 19 with TypeScript.
- Yarn 4 handles dependencies.
- See `app/` and `components/` for primary modules.

## Task recipes
### Start development server
```bash
yarn dev
```
### Build for production
```bash
yarn build
```

## Code style
- Format with Prettier.
- ESLint must report zero warnings.

## Analytics
- Uses `@vercel/analytics` and Speed Insights.

## Accessibility
- Run `yarn a11y` to audit pages.

## CI
- GitHub Actions run lint, type-check, and tests on each push.

## Troubleshooting
- Reset modules: `rm -rf node_modules && yarn install`.
- Clear build cache: `yarn build --no-cache`.

## Pull-request checklist
- [ ] Documentation updated.
- [ ] Tests cover changes.
- [ ] `yarn lint` passes.
- [ ] `yarn typecheck` passes.
- [ ] `yarn test` passes.
- [ ] Ready for review.
