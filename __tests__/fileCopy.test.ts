import {
  copyStreamWithProgress,
  formatBytes,
  formatEta,
} from '../utils/fileCopy';

function createChunkGenerator(chunks: Uint8Array[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        yield chunk;
      }
    },
  };
}

describe('fileCopy helpers', () => {
  it('copies all chunks and reports progress', async () => {
    const chunks = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6, 7]),
    ];
    const sinkWrites: Uint8Array[] = [];
    const schedule = (cb: (timestamp: number) => void) => cb(0);
    const nowValues = [0, 500, 1000, 1500];
    const now = () => nowValues.shift() ?? 2000;
    const progressEvents: number[] = [];

    const final = await copyStreamWithProgress(
      createChunkGenerator(chunks),
      {
        write: async (chunk) => {
          sinkWrites.push(chunk);
        },
        close: async () => {},
      },
      {
        jobId: 'job-1',
        totalBytes: 7,
        schedule,
        now,
        persistIntervalMs: 200,
        onProgress: (progress) => {
          progressEvents.push(progress.bytesProcessed);
        },
        onPersist: jest.fn(),
      },
    );

    expect(sinkWrites).toHaveLength(2);
    expect(sinkWrites[0]).toEqual(chunks[0]);
    expect(sinkWrites[1]).toEqual(chunks[1]);
    expect(progressEvents).toContain(3);
    expect(progressEvents).toContain(7);
    expect(final.bytesProcessed).toBe(7);
    expect(final.totalBytes).toBe(7);
    expect(final.throughput).toBeGreaterThan(0);
    expect(final.etaMs).toBe(0);
  });

  it('aborts copy when signal triggered and calls sink abort', async () => {
    const chunks = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
    ];
    const controller = new AbortController();
    let abortCalled = false;
    const schedule = (cb: (timestamp: number) => void) => cb(0);
    const now = () => 0;

    await expect(
      copyStreamWithProgress(
        createChunkGenerator(chunks),
        {
          write: async (chunk) => {
            if (chunk[0] === 4) {
              controller.abort();
            }
          },
          abort: async () => {
            abortCalled = true;
          },
        },
        {
          jobId: 'job-2',
          totalBytes: 6,
          schedule,
          now,
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow('Copy aborted');

    expect(abortCalled).toBe(true);
  });

  it('formats helpers correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');

    expect(formatEta(null)).toBe('—');
    expect(formatEta(-10)).toBe('—');
    expect(formatEta(1500)).toBe('2s');
    expect(formatEta(65_000)).toBe('1m 5s');
    expect(formatEta(3_700_000)).toBe('1h 1m 40s');
  });
});

