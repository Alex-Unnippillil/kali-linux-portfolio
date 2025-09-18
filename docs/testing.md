# Testing

## Crypto toolkit performance coverage

The Playwright spec at `playwright/tests/crypto-toolkit.spec.ts` opens the
desktop app shell and evaluates the crypto toolkit workflows inside the browser
context. The test exercises three flows with the Web Crypto API:

- SHA-256 hashing of a static message.
- AES-GCM encryption and decryption round-trip with a 256-bit key.
- JWT creation and verification using an HS256 (HMAC-SHA-256) signature.

Each operation is wrapped with `performance.mark`/`performance.measure` so the
spec asserts durations were recorded. After the flows run it inspects
`performance.getEntriesByType('longtask')` to ensure no crypto interaction held
the main thread for 50 ms or longer, and compares
`performance.memory.usedJSHeapSize` before and after clearing temporary state to
confirm memory returns to the baseline window.

## Running the checks locally

- Run only the crypto toolkit check:
  ```bash
  npx playwright test playwright/tests/crypto-toolkit.spec.ts
  ```
- Run the full verification pipeline (includes lint, type-check, build, smoke
  routes, and the Playwright suite):
  ```bash
  yarn verify:all
  ```

The `verify:all` script now starts the production server on a random port and
runs Playwright with `BASE_URL` pointed at that instance so the new spec executes
as part of CI and local verification.
