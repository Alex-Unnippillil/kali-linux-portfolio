# Deterministic serialization helpers

`utils/serdes.ts` exposes utilities for producing a canonical JSON payload. They exist to keep
cache keys, snapshot exports, and diff calculations stable even when key insertion order varies.

## When to reach for `deterministicStringify`

Use the deterministic serializer whenever a string representation is used to:

- Generate cache keys or memoization maps.
- Compare complex structures for equality (for example, diffing UI state before syncing to a worker).
- Persist snapshots that should remain identical across runs even if object key order changes.

It mirrors `JSON.stringify` for supported inputs but sorts object keys and normalizes specific
primitives so the output is consistent. The helper returns `undefined` when the source value would be
omitted by `JSON.stringify` (for example a top-level `undefined`). Handle that case before storing
results.

## Primitive handling

- **BigInt** values are supported. They are converted to the tagged structure
  `{ "$$deterministicType": "bigint", "value": "<digits>" }` to keep intent explicit. Parse the
  string with `parseDeterministicJSON` to recover real `bigint` values if needed.
- **Dates** serialize to ISO-8601 strings using the existing `toJSON` behaviour.
- **Non-finite numbers** (`NaN`, `Infinity`, `-Infinity`) collapse to `null`, matching vanilla JSON.
- **Typed arrays** are converted to plain arrays so their contents remain ordered and comparable.

## Companion helpers

- `deterministicEquals(a, b)` reuses the serializer to perform stable structural comparisons.
- `parseDeterministicJSON(serialized)` revives deterministic output (including `bigint` tags) back to
  runtime values.

## Pitfalls and guidance

- The serializer intentionally throws on circular references to mirror `JSON.stringify`. Break
  cycles before calling it.
- The canonical output may differ from the default JSON order. Consumers that diff raw strings should
  switch to the deterministic helper at the same time to avoid false positives.
- Keep snapshots human-readable by formatting after serialization if needed (e.g. wrap in
  `JSON.stringify(JSON.parse(deterministicStringify(obj)!), null, 2)`).
- Do not feed untrusted deterministic payloads directly into `JSON.parse` if you need `bigint`
  recovery—use `parseDeterministicJSON` so the tagged values revive correctly.

Adopting these helpers on snapshot-sensitive code paths ensures order-only changes no longer evict
caches or churn diffs.
