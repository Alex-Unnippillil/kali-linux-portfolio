# QA Guidelines

This project relies on automated linting, unit tests, and Playwright smoke tests. When adding new checks or tests, follow the
expectations below to keep CI green and ensure the desktop shell loads cleanly.

## Console noise policy

Playwright is configured to fail any test that sees an unexpected `console.warn` or `console.error`. The shared fixture in
[`tests/fixtures.ts`](../tests/fixtures.ts) registers a listener for every page and throws after the test if warnings or errors were
emitted. Use the provided `expectConsoleMessage` helper to document any message that is expected for a scenario.

```ts
import { test } from './fixtures';

test('handles optional warning', async ({ page, expectConsoleMessage }) => {
  expectConsoleMessage({
    type: 'warning',
    regex: /Plugin .* requires Volatility /,
    description: 'Volatility compatibility message',
    optional: true,
  });

  await page.goto('/apps/volatility');
  // ...assertions...
});
```

Guidelines:

- Expect messages **before** the action that triggers them.
- Use `message` for exact matches or `regex` for patterns. Set `optional: true` when the warning is environment dependent.
- Tests fail if an expected message does not appear (unless `optional: true`) or if an unexpected warning/error is logged.
- Do not blanket-ignore warnings. Document why a message is acceptable in the `description` field.

## Required checks before merging

Run the following locally and ensure they pass:

- `yarn lint`
- `yarn test`
- `npx playwright test`

If Playwright cannot run because browser dependencies are missing, record the limitation in the PR description.
