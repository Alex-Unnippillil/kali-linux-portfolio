# Diff utilities and DiffView component

The diff helpers centralize Myers-based text comparison, structural JSON diffing, and the worker-backed pool used by `DiffView`. Use these utilities when you need fast, cancellable comparisons in an app window or worker.

## Packages

All exports live under `utils/diff/`:

- `diffText(left: string, right: string)` – Myers diff that returns inline segments with `type` (`equal | insert | delete`) and `text`.
- `diffJson(left: unknown, right: unknown)` – Recursively compares objects and nested arrays, yielding `JsonDiffEntry` records with a `path`, `kind`, and value snapshots.
- `diffArray(left: unknown[], right: unknown[])` – Array-specialized helper used by `diffJson` that reports per-index adds/removals/changes.
- `DiffWorkerPool` – Browser-friendly worker pool with queueing, cancellation via `AbortSignal`, and automatic worker recovery.
- `getDiffWorkerPool()` – Lazily instantiates a shared pool (returns `null` on the server).
- `runDiff(mode, payload)` – Synchronous helper that mirrors the worker contract for `'text' | 'json' | 'array'` jobs.

### Worker messages

When scheduling work manually, post the following to `workers/diff.worker.ts`:

```ts
postMessage({
  type: 'diff',
  id: 'job-id',
  mode: 'text' | 'json' | 'array',
  payload: { left, right },
});
```

Cancel with `postMessage({ type: 'cancel', id })`. Responses include `{ status: 'success', result }`, `{ status: 'error', error }`, or `{ status: 'cancelled' }`.

## DiffView component

`components/common/DiffView.tsx` renders inline text diffs or a structured table for JSON/array results. It automatically dispatches comparisons through the worker pool (falling back to synchronous execution if workers are unavailable), exposes copy buttons for each side, and supports a resolution callback:

```tsx
<DiffView
  left={baseline}
  right={incoming}
  mode="json"
  leftLabel="Current"
  rightLabel="Proposed"
  onResolve={(selection, value) => apply(selection === 'left' ? baseline : incoming)}
/>
```

The component handles 1&nbsp;MB inputs by offloading work to the worker pool and will cancel in-flight jobs when props change.

## Storybook

See `stories/DiffView.stories.tsx` for quick usage recipes covering text and JSON comparisons.
