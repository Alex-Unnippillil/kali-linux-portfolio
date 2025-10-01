import { TransformStream } from 'stream/web';
import { createFrameDecoderStream } from '../utils/streams/frameDecoder';
import { createJsonlParserStream } from '../utils/streams/jsonlParser';
import { createLineSplitterStream } from '../utils/streams/lineSplitter';

if (typeof (globalThis as any).TransformStream === 'undefined') {
  (globalThis as any).TransformStream = TransformStream;
}

describe('stream utilities', () => {
  test('line splitter preserves multi-byte characters across chunks', async () => {
    const splitter = createLineSplitterStream();
    const writer = splitter.writable.getWriter();
    const reader = splitter.readable.getReader();
    const outputs: string[] = [];
    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        outputs.push(value);
      }
    })();

    const encoder = new TextEncoder();
    const data = encoder.encode('🚀 launch\nready');
    await writer.write(data.slice(0, 1));
    await writer.write(data.slice(1, 5));
    await writer.write(data.slice(5));
    await writer.close();
    await readerPromise;

    expect(outputs).toEqual(['🚀 launch', 'ready']);
  });

  test('jsonl parser buffers partial tokens until complete', async () => {
    const lineSplitter = createLineSplitterStream();
    const jsonlParser = createJsonlParserStream();
    const pipeline = lineSplitter.readable.pipeThrough(jsonlParser);
    const writer = lineSplitter.writable.getWriter();
    const reader = pipeline.getReader();
    const results: any[] = [];

    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value.type === 'json') {
          results.push(value.value);
        }
      }
    })();

    const encoder = new TextEncoder();
    await writer.write(encoder.encode('{"a":1'));
    await writer.write(encoder.encode(',"b":2}\n'));
    await writer.close();
    await readerPromise;

    expect(results).toEqual([{ a: 1, b: 2 }]);
  });

  test('frame decoder reconstructs framed payloads across chunk boundaries', async () => {
    const decoder = createFrameDecoderStream();
    const writer = decoder.writable.getWriter();
    const reader = decoder.readable.getReader();
    const outputs: string[] = [];
    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        outputs.push(new TextDecoder().decode(value));
      }
    })();

    const encoder = new TextEncoder();
    const frames = ['alpha', 'beta', 'gamma'].map((text) => {
      const body = encoder.encode(text);
      const framed = new Uint8Array(4 + body.byteLength);
      new DataView(framed.buffer).setUint32(0, body.byteLength);
      framed.set(body, 4);
      return framed;
    });

    const combined = new Uint8Array(
      frames.reduce((sum, frame) => sum + frame.byteLength, 0),
    );
    let offset = 0;
    for (const frame of frames) {
      combined.set(frame, offset);
      offset += frame.byteLength;
    }

    await writer.write(combined.slice(0, 5));
    await writer.write(combined.slice(5, 9));
    await writer.write(combined.slice(9));
    await writer.close();
    await readerPromise;

    expect(outputs).toEqual(['alpha', 'beta', 'gamma']);
  });
});
