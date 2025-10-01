export interface FrameDecoderOptions {
  /** Treat the 4-byte length prefix as little endian. Defaults to big endian. */
  littleEndian?: boolean;
  /** Maximum allowed frame length in bytes. */
  maxFrameLength?: number;
}

const HEADER_LENGTH = 4;

/**
 * Creates a TransformStream that decodes 4-byte length prefixed frames from a
 * chunked Uint8Array source. Payloads are emitted exactly once they are
 * complete so consumers can process large responses without buffering.
 */
export const createFrameDecoderStream = (
  options: FrameDecoderOptions = {},
): TransformStream<Uint8Array, Uint8Array> => {
  const { littleEndian = false, maxFrameLength = 32 * 1024 * 1024 } = options;
  let buffer = new Uint8Array(0);
  let expectedLength: number | null = null;

  const viewLength = (view: DataView): number =>
    littleEndian ? view.getUint32(0, true) : view.getUint32(0, false);

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (!(chunk instanceof Uint8Array)) {
        chunk = new Uint8Array(chunk);
      }
      if (chunk.length === 0) return;

      if (buffer.length) {
        const combined = new Uint8Array(buffer.length + chunk.length);
        combined.set(buffer);
        combined.set(chunk, buffer.length);
        buffer = combined;
      } else {
        buffer = chunk;
      }

      let offset = 0;
      while (true) {
        if (expectedLength === null) {
          if (buffer.length - offset < HEADER_LENGTH) break;
          const header = new DataView(
            buffer.buffer,
            buffer.byteOffset + offset,
            HEADER_LENGTH,
          );
          expectedLength = viewLength(header);
          if (expectedLength < 0 || expectedLength > maxFrameLength) {
            throw new RangeError(`Invalid frame length: ${expectedLength}`);
          }
          offset += HEADER_LENGTH;
        }
        if (expectedLength === null) break;
        if (buffer.length - offset < expectedLength) break;
        const frame = buffer.slice(offset, offset + expectedLength);
        controller.enqueue(frame);
        offset += expectedLength;
        expectedLength = null;
      }
      buffer = buffer.slice(offset);
    },
    flush(controller) {
      if (expectedLength !== null) {
        // Flush any partial payload as best-effort data to avoid losing bytes.
        controller.enqueue(buffer);
      } else if (buffer.length) {
        controller.enqueue(buffer);
      }
      buffer = new Uint8Array(0);
      expectedLength = null;
    },
  });
};

export type FrameDecoderStream = ReturnType<typeof createFrameDecoderStream>;
