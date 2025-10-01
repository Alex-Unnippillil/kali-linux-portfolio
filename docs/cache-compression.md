# Cache Compression Rollout

## Pipeline summary
- Compression utilities live in `utils/cacheCompression.ts` and rely on streaming `CompressionStream` APIs when available, falling back to chunked [`pako`](https://github.com/nodeca/pako) processing in Node and older browsers.
- Blobs are encoded as JSON strings. Values ≥ 512&nbsp;KB (`COMPRESSION_THRESHOLD`) are gzip-compressed and stored as base64 payloads. Smaller entries keep the original JSON to avoid unnecessary decode cost.
- Helper wrappers (`encodeCacheValue`/`decodeCacheValue`) integrate with IDB caches, OPFS fallbacks, and worker responses so the calling code does not deal with envelope metadata.
- Synchronous helpers (`encodeCacheValueSync`/`decodeCacheValueSync`) exist for measurement and legacy localStorage paths that must remain blocking.

## Measurement
`measure.js` and `docs/cache-compression-stats.json` capture a representative 20,000 record dataset (~2.3&nbsp;MB raw) using the synchronous helpers to keep instrumentation deterministic.

Key findings from the measurement:

- Raw JSON size: **2,344,559 bytes**.
- Compressed payload: **106,429 bytes** (~4.5% of original).
- P95 baseline `JSON.parse` time: **42.1&nbsp;ms**.
- P95 decode (gzip + parse) time: **78.5&nbsp;ms**.
- Absolute decode overhead: **36.5&nbsp;ms** (~86% slower than parse in isolation).

Although the decode stage is slower than parsing the raw JSON string, the caches that cross the 512&nbsp;KB threshold already spend hundreds of milliseconds retrieving IDB records or OPFS blobs. In our dev traces (fixtures/nessus flows) those fetches average **~820&nbsp;ms**, so the additional 36.5&nbsp;ms amounts to **~4.5%** of the wall-clock budget.

We will continue to monitor the true P95 from browser `PerformanceObserver` samples and adjust the threshold if larger datasets regress.

## Integration checklist
- `utils/storage.ts`, `utils/idb.ts`, and `components/apps/Games/common/save/index.ts` now encode envelopes before storing to IDB.
- Workers that post large payloads (`fixturesParser`, `simulatorParser.worker`, `nessus-parser`) emit compressed envelopes that the UI unwraps.
- LocalStorage bridges (`components/FixturesLoader.tsx`, Nessus helper functions) use the synchronous helpers so legacy string storage keeps metadata.

Refer to `measure.js` for a reproducible benchmark when tuning chunk sizes or thresholds.
