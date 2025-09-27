# App search hook

The `useAppSearch` hook consolidates the live-search behaviour used across applications such as Terminal, VSCode, the file explorer, and the Whisker menu. It provides debounced query management, highlight helpers, and metadata so UIs can present consistent status messaging.

## Usage

```tsx
import useAppSearch from '../hooks/useAppSearch';

const items = [
  { id: 'terminal', title: 'Terminal' },
  { id: 'files', title: 'File Explorer' },
];

const { query, setQuery, results, highlight, metadata } = useAppSearch(items, {
  getLabel: (item) => item.title,
  debounceMs: 150,
});
```

* `query` / `setQuery` manage the raw input value while updates are debounced automatically.
* `results` is an array of `{ item, index, position }` objects ready for rendering.
* `highlight(text)` wraps matched segments in `<mark>` so the UI can display emphasis without manual string slicing.
* `metadata` exposes counts, the debounced query, and an `isSearching` flag that can drive status text or loaders.

Optional overrides let callers plug in a custom filter or highlight strategy:

```tsx
const search = useAppSearch(files, {
  getLabel: (file) => `${file.path}/${file.name}`,
  filter: (file, { normalizedQuery }) => file.tags.includes(normalizedQuery),
  highlight: (text, rawQuery) => highlightWithFuzzyLogic(text, rawQuery),
  limit: 20,
});
```

The hook is resilient to dynamic data: pass the latest array of items and it will recompute the filtered results as soon as the debounced query settles. Remember to call the returned `reset()` helper when the surrounding context changes (e.g., closing a palette or switching categories) to keep the UX predictable.

## Tests

Unit coverage lives in `__tests__/hooks/useAppSearch.test.tsx`, while `__tests__/WhiskerMenuSearch.test.tsx` exercises an integration that consumes the hook.
