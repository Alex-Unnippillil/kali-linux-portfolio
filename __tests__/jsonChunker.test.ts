import { ReadableStream } from 'node:stream/web';

import { jsonChunker } from '../utils/streams/jsonChunker';

describe('jsonChunker', () => {
  jest.setTimeout(60000);

  const encoder = new TextEncoder();

  function stringStream(chunks: string[]): ReadableStream<Uint8Array> {
    let index = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= chunks.length) {
          controller.close();
          return;
        }
        const chunk = encoder.encode(chunks[index]);
        index += 1;
        controller.enqueue(chunk);
      },
    });
  }

  it('parses NDJSON incrementally and reports errors', async () => {
    const stream = stringStream(['{"a":1}\n', '{"a":2}\n{"b":3}\n', 'invalid\n', '{"c":4}\n']);
    const items: any[] = [];
    const errors: string[] = [];
    let progressEvents = 0;

    for await (const event of jsonChunker(stream, { progressThrottleMs: 0 })) {
      if (event.type === 'item') {
        items.push(event.value);
      } else if (event.type === 'error') {
        errors.push(event.error.message);
      } else if (event.type === 'progress') {
        progressEvents += 1;
      }
    }

    expect(items).toHaveLength(4);
    expect(items[0]).toEqual({ a: 1 });
    expect(items[2]).toEqual({ b: 3 });
    expect(items[3]).toEqual({ c: 4 });
    expect(errors).toHaveLength(1);
    expect(progressEvents).toBeGreaterThan(0);
  });

  it('processes a 50MB stream without blocking the event loop for long', async () => {
    const totalBytes = 50 * 1024 * 1024;
    const stream = createLargeStream(totalBytes);
    const delays: number[] = [];
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      delays.push(now - last);
      last = now;
    }, 10);

    let parsed = 0;
    await (async () => {
      for await (const event of jsonChunker(stream, {
        totalBytes,
        progressThrottleMs: 0,
        yieldIntervalMs: 8,
      })) {
        if (event.type === 'item' || event.type === 'error') {
          parsed += 1;
        }
      }
    })();

    clearInterval(interval);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(parsed).toBeGreaterThan(0);
    const maxDelay = delays.length ? Math.max(...delays) : 0;
    expect(maxDelay).toBeLessThan(50);
  });

  function createLargeStream(totalBytes: number): ReadableStream<Uint8Array> {
    const line = `{"value":"${'x'.repeat(900)}"}\n`;
    const chunkText = line.repeat(32);
    const chunkBytes = encoder.encode(chunkText);
    let sent = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= totalBytes) {
          controller.close();
          return;
        }
        const remaining = totalBytes - sent;
        const size = Math.min(chunkBytes.length, remaining);
        controller.enqueue(chunkBytes.subarray(0, size));
        sent += size;
        if (sent >= totalBytes) {
          controller.close();
          return;
        }
        return new Promise<void>((resolve) => setTimeout(resolve, 0));
      },
      cancel() {
        sent = totalBytes;
      },
    });
  }
});
