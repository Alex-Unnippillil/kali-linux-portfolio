/// <reference types="node" />

import { createFrameDecoderStream } from '../utils/streams/frameDecoder';
import { createJsonlParserStream } from '../utils/streams/jsonlParser';
import { createLineSplitterStream } from '../utils/streams/lineSplitter';

const encoder = new TextEncoder();

const buildDataset = (count: number): string => {
  const rows: string[] = [];
  for (let i = 0; i < count; i++) {
    rows.push(renderRow(i));
  }
  return rows.join('\n');
};

const renderRow = (i: number): string =>
  JSON.stringify({
    id: i,
    host: `192.168.0.${i % 255}`,
    service: 'http',
    status: i % 7 === 0 ? 'open' : 'filtered',
    banner: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
  });

const frameChunk = (chunk: Uint8Array): Uint8Array => {
  const framed = new Uint8Array(4 + chunk.byteLength);
  new DataView(framed.buffer).setUint32(0, chunk.byteLength);
  framed.set(chunk, 4);
  return framed;
};

const naiveParse = (payload: string): number => {
  const lines = payload.split('\n');
  return lines.reduce((count, line) => {
    if (!line.trim()) return count;
    JSON.parse(line);
    return count + 1;
  }, 0);
};

const streamingParse = async (count: number): Promise<number> => {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= count) {
        controller.close();
        return;
      }
      const line = renderRow(index++) + '\n';
      controller.enqueue(frameChunk(encoder.encode(line)));
    },
  });
  const reader = stream
    .pipeThrough(createFrameDecoderStream())
    .pipeThrough(createLineSplitterStream())
    .pipeThrough(createJsonlParserStream())
    .getReader();
  let parsedCount = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value.type === 'json') parsedCount += 1;
  }
  return parsedCount;
};

const toMB = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 100) / 100;

const run = async () => {
  let payload = buildDataset(120_000);
  global.gc?.();
  const beforeNaive = process.memoryUsage().heapUsed;
  const naiveCount = naiveParse(payload);
  const naiveAfter = process.memoryUsage().heapUsed;
  payload = '';
  global.gc?.();

  const beforeStream = process.memoryUsage().heapUsed;
  const streamCount = await streamingParse(120_000);
  const streamAfter = process.memoryUsage().heapUsed;
  global.gc?.();

  console.log(
    JSON.stringify(
      {
        rows: { naive: naiveCount, streaming: streamCount },
        memoryMB: {
          naive: toMB(naiveAfter - beforeNaive),
          streaming: toMB(streamAfter - beforeStream),
        },
        reductionPct:
          naiveAfter - beforeNaive > 0
            ?
                Math.round(
                  (((naiveAfter - beforeNaive) - (streamAfter - beforeStream)) /
                    (naiveAfter - beforeNaive)) *
                    1000,
                ) /
              10
            : 0,
      },
      null,
      2,
    ),
  );
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
