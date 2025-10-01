export interface JsonlParserOptions<T = unknown> {
  /** JSON.parse reviver */
  reviver?: (this: any, key: string, value: any) => T;
  /** Skip blank lines instead of emitting them as invalid entries. */
  allowEmptyLines?: boolean;
  /** Do not emit invalid events, simply drop them. */
  skipInvalid?: boolean;
  /** Attempt to buffer partial JSON tokens across chunks. */
  allowPartial?: boolean;
}

export type JsonlParseEvent<T = unknown> =
  | { type: 'json'; value: T; raw: string }
  | { type: 'invalid'; raw: string; error: string };

/**
 * Creates a TransformStream that accepts JSON Lines chunks and emits parsed
 * objects. The stream buffers incomplete tokens until the next chunk arrives
 * so that partial payloads can be recovered without allocating the whole file.
 */
export const createJsonlParserStream = <T = unknown>(
  options: JsonlParserOptions<T> = {},
): TransformStream<string, JsonlParseEvent<T>> => {
  const {
    reviver,
    allowEmptyLines = true,
    skipInvalid = false,
    allowPartial = true,
  } = options;

  let pending = '';
  let pendingHadData = false;

  return new TransformStream<string, JsonlParseEvent<T>>({
    transform(chunk, controller) {
      const source = pending ? pending + chunk : chunk;
      if (allowEmptyLines && !source.trim()) {
        pending = '';
        pendingHadData = false;
        return;
      }
      try {
        const value = JSON.parse(source, reviver);
        controller.enqueue({ type: 'json', value, raw: source });
        pending = '';
        pendingHadData = false;
      } catch (err) {
        if (!allowPartial) {
          if (!skipInvalid) {
            controller.enqueue({
              type: 'invalid',
              raw: source,
              error: (err as Error).message,
            });
          }
          pending = '';
          pendingHadData = false;
          return;
        }
        if (pendingHadData) {
          if (!skipInvalid) {
            controller.enqueue({
              type: 'invalid',
              raw: source,
              error: (err as Error).message,
            });
          }
          pending = '';
          pendingHadData = false;
        } else {
          pending = source;
          pendingHadData = true;
        }
      }
    },
    flush(controller) {
      if (pending) {
        try {
          const value = JSON.parse(pending, reviver);
          controller.enqueue({ type: 'json', value, raw: pending });
        } catch (err) {
          if (!skipInvalid) {
            controller.enqueue({
              type: 'invalid',
              raw: pending,
              error: (err as Error).message,
            });
          }
        }
      }
      pending = '';
      pendingHadData = false;
    },
  });
};

export type JsonlParserStream<T = unknown> = ReturnType<
  typeof createJsonlParserStream<T>
>;
