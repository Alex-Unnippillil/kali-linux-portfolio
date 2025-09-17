# Design token versioning

The base theme tokens live in [`styles/tokens.css`](../styles/tokens.css). To make the values consumable
outside of CSS (tests, documentation, data work), we keep a snapshot in [`styles/tokens.json`](../styles/tokens.json).

## Update workflow

1. Edit the values in `styles/tokens.css`.
2. Generate the JSON snapshot with `yarn tokens:sync`.
3. Bump the `version` field inside `styles/tokens.json` to a new semver string so downstream consumers can
   react to the change.
4. Re-run the tests with the new version exported through the environment:

   ```bash
   TOKEN_VERSION_BUMP=<new version> yarn test
   ```

   The `tests/theming/tokens.spec.ts` suite fails fast when the CSS and JSON diverge and reminds you to bump
   the version. When `TOKEN_VERSION_BUMP` is defined, the suite also asserts that the manifest version matches
   the provided value.
5. Commit the CSS and JSON files together so CI sees a synchronized pair.

> Tip: `yarn tokens:sync` also honours the `TOKEN_VERSION_BUMP` environment variable, letting you set the
> version in one place while regenerating the manifest.
