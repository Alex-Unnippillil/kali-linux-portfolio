# App Router Migration

This guide outlines how to migrate from Next.js's Pages Router to the App Router.

## Prerequisites

- **Node.js**: Ensure your development environment runs Node.js version 18.17 or newer.
- **Next.js upgrade**: Update Next.js and React to their latest versions:
  ```bash
  yarn add next@latest react@latest react-dom@latest
  ```
  After installing, address any upgrade warnings before proceeding.

## Phased Migration Strategy

1. **Introduce a single App Router route**
   - Create an `app/` directory and move one non-critical page into it.
   - Keep the existing `pages/` directory intact; both routers can coexist.
2. **Incremental adoption**
   - Gradually move additional routes or features to the App Router.
   - Refactor shared layouts and components as needed.
3. **Maintain Pages Router during transition**
   - Continue serving remaining routes through the Pages Router until all are migrated.
   - Monitor for feature parity and performance before removing `pages/`.

## Testing and Deployment Considerations

- Run your test suite after each migration step to catch regressions early.
- Validate both routers in preview deployments before shipping to production.
- Update build and deployment pipelines to handle the `app/` directory and any new configuration.

Following this approach allows a controlled adoption of the App Router while ensuring stability throughout the migration.
