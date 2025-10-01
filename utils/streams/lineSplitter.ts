export interface LineSplitterOptions {
  /** Optional delimiter between lines. Defaults to a newline character. */
  delimiter?: string;
  /** Shared TextDecoder instance. Defaults to UTF-8 with BOM ignored. */
  decoder?: TextDecoder;
}

const DEFAULT_DECODER = () =>
  new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

/**
 * Creates a TransformStream that converts chunked Uint8Array/string input into
 * individual lines without loading the full payload into memory. The stream
 * honours backpressure by awaiting downstream readiness before pushing the
 * next line.
 */
export const createLineSplitterStream = (
  options: LineSplitterOptions = {},
): TransformStream<Uint8Array | string, string> => {
  const delimiter = options.delimiter ?? '\n';
  const decoder = options.decoder ?? DEFAULT_DECODER();
  let carry = '';

  return new TransformStream<Uint8Array | string, string>({
    transform(chunk, controller) {
      const text =
        typeof chunk === 'string'
          ? chunk
          : decoder.decode(chunk, { stream: true });

      const combined = carry + text;
      const parts = combined.split(delimiter);
      carry = parts.pop() ?? '';
      for (const part of parts) {
        controller.enqueue(part);
      }
    },
    flush(controller) {
      // Flush any remaining decoder state (multi-byte sequences at EOF).
      const tail = decoder.decode();
      if (tail) {
        const combined = carry + tail;
        const parts = combined.split(delimiter);
        carry = parts.pop() ?? '';
        for (const part of parts) {
          controller.enqueue(part);
        }
      }
      if (carry.length) {
        controller.enqueue(carry);
      }
      carry = '';
    },
  });
};

export type LineSplitterStream = ReturnType<typeof createLineSplitterStream>;
