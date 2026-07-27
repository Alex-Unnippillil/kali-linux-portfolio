const DEFAULT_PROGRESS_THROTTLE_MS = 50;
const DEFAULT_YIELD_INTERVAL_MS = 16;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface JsonChunkerOptions {
  /** Total bytes expected from the source stream. Used to emit progress percentages. */
  totalBytes?: number;
  /** Abort parsing early. */
  signal?: AbortSignal | null;
  /** Minimum time between progress events (ms). Defaults to 50ms. */
  progressThrottleMs?: number;
  /** Maximum time to run without yielding back to the event loop (ms). Defaults to 16ms. */
  yieldIntervalMs?: number;
}

export type JsonChunkEvent<T = unknown> =
  | { type: 'item'; value: T }
  | { type: 'progress'; loaded: number; total?: number }
  | { type: 'error'; error: Error; raw: string };

function shouldYield(last: number, interval: number | undefined) {
  if (!interval || interval <= 0) return false;
  return now() - last >= interval;
}

async function yieldToEventLoop() {
  await new Promise<void>((resolve) => {
    if (typeof setTimeout === 'function') {
      setTimeout(resolve, 0);
    } else if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  });
}

function sanitizeLine(line: string) {
  return line.replace(/\r$/, '').trim();
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export async function* jsonChunker<T = unknown>(
  stream: ReadableStream<Uint8Array>,
  options: JsonChunkerOptions = {},
): AsyncGenerator<JsonChunkEvent<T>> {
  const {
    totalBytes,
    signal,
    progressThrottleMs = DEFAULT_PROGRESS_THROTTLE_MS,
    yieldIntervalMs = DEFAULT_YIELD_INTERVAL_MS,
  } = options;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let loaded = 0;
  let lastProgress = 0;
  let lastYield = now();

  const abortIfNeeded = () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  };

  try {
    while (true) {
      abortIfNeeded();
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      loaded += value.byteLength;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        abortIfNeeded();
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const trimmed = sanitizeLine(line);
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed) as T;
            yield { type: 'item', value: parsed };
          } catch (error) {
            yield { type: 'error', error: toError(error), raw: trimmed };
          }
        }
        if (shouldYield(lastYield, yieldIntervalMs)) {
          await yieldToEventLoop();
          lastYield = now();
        }
        newlineIndex = buffer.indexOf('\n');
      }

      const current = now();
      if (!progressThrottleMs || current - lastProgress >= progressThrottleMs) {
        lastProgress = current;
        yield { type: 'progress', loaded, total: totalBytes };
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        abortIfNeeded();
        const trimmed = sanitizeLine(line);
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as T;
          yield { type: 'item', value: parsed };
        } catch (error) {
          yield { type: 'error', error: toError(error), raw: trimmed };
        }
        if (shouldYield(lastYield, yieldIntervalMs)) {
          await yieldToEventLoop();
          lastYield = now();
        }
      }
    }

    const finalLoaded = totalBytes ?? loaded;
    yield { type: 'progress', loaded: finalLoaded, total: totalBytes ?? finalLoaded };
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
