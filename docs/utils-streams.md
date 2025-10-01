# Stream processing utilities

The `utils/streams` folder exposes composable [WHATWG streams](https://developer.mozilla.org/docs/Web/API/Streams_API) that keep
large uploads and fixtures from being buffered entirely in memory. Each helper focuses on one responsibility so they can be
chained to form higher level parsers.

## Available transforms

| Utility | Purpose | Typical composition |
| --- | --- | --- |
| `createFrameDecoderStream` | Reassembles 4-byte length-prefixed binary frames. | `ReadableStream` → `frameDecoder` → `lineSplitter` |
| `createLineSplitterStream` | Converts chunked `Uint8Array` or `string` input into UTF-8 lines while handling multibyte characters and BOMs. | `frameDecoder` → `lineSplitter` → downstream transform |
| `createJsonlParserStream` | Parses JSONL rows, buffering partial tokens and emitting structured parse/invalid events. | `lineSplitter` → `jsonlParser` → consumer |

## Usage examples

### JSONL fixtures

```ts
const reader = readable
  .pipeThrough(createFrameDecoderStream())
  .pipeThrough(createLineSplitterStream())
  .pipeThrough(createJsonlParserStream())
  .getReader();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  if (value.type === 'json') {
    // handle parsed row
  }
}
```

### Chunked XML parsing

The Nessus worker combines the frame decoder with the line splitter and a lightweight host state machine. Each decoded frame is
written directly to the splitter so only the current `<ReportHost>` block is held in memory at any time.

## Limitations and notes

- The frame decoder expects a **4-byte big-endian length prefix**. Producers must wrap raw chunks before posting them to a
  worker.
- Streams rely on browser and Node 18+ implementations of the WHATWG Streams API. Older environments require a polyfill.
- `createJsonlParserStream` buffers at most a single incomplete token. Truly malformed payloads are surfaced through
  `type: 'invalid'` events so callers can log or skip them.

## Memory impact

Running `NODE_OPTIONS=--expose-gc yarn dlx ts-node --compiler-options '{"module":"commonjs"}' scripts/measure-stream-memory.ts`
with 120k fixture rows showed the streaming pipeline peaking at **~2.6 MiB** compared to **~12.2 MiB** for the naive
`split('\n')` approach, a ~78 % reduction in heap growth.【a89755†L1-L10】
