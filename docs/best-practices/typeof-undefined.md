# Handling `typeof === 'undefined'` Checks

This note captures a recurring theme from recent code reviews: ensuring we guard browser-only APIs without scattering raw `typeof window === 'undefined'` checks throughout the code base.

## Why centralize the check?

* **Consistency.** A shared helper makes the intent obvious and avoids typos such as comparing against the wrong string literal.
* **Lint compliance.** We disable the `no-top-level-window` lint in a single helper instead of sprinkling disable comments through feature files.
* **Future flexibility.** If the project needs to extend the environment check (for example, verifying `document` or `navigator`), we can change it in one place.

## Preferred pattern

Use the `isBrowser` utility exported from `utils/isBrowser.ts`:

```ts
import { isBrowser } from '@/utils/isBrowser';

if (!isBrowser) {
  return;
}

// Safe to use browser-only APIs below this line
localStorage.setItem(...);
```

When you need to check for additional APIs (e.g., `indexedDB` or `window.matchMedia`), build on top of that helper rather than repeating the `typeof` comparison inline.

## Example refactor

`utils/storage.ts` now imports `isBrowser` and reuses it for every guard instead of repeating `typeof window === 'undefined'`. The logic stays the same, but the intent is clearer and easier to maintain.
