import { guardFile, parseNdjsonStream, wrapWorker, fetchWithRetry } from '@lib/utilities';
import { useToastLogger } from '@lib/utilities/useToastLogger';
import { renderHook, act } from '@testing-library/react';
import { ReadableStream } from 'stream/web';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill encoding APIs for the test environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;

describe('guardFile', () => {
  it('validates size and type', () => {
    const file = { size: 10, type: 'text/plain' } as File;
    expect(guardFile(file, { maxSize: 20, mimeTypes: ['text/plain'] })).toBe(true);
    expect(() => guardFile(file, { maxSize: 5 })).toThrow('File too large');
    expect(() => guardFile(file, { mimeTypes: ['image/png'] })).toThrow('Invalid file type');
  });
});

describe('parseNdjsonStream', () => {
  it('parses streamed objects', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"a":1}\n{"b":2}\n'));
        controller.close();
      },
    });
    const out: any[] = [];
    for await (const obj of parseNdjsonStream(stream)) out.push(obj);
    expect(out).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe('fetchWithRetry', () => {
  it('retries on failure', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue({ ok: true } as Response);
    // @ts-ignore
    global.fetch = mockFetch;
    const res = await fetchWithRetry('https://example.com', {}, 10, 1);
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('wrapWorker', () => {
  it('wraps worker communication', async () => {
    class MockWorker {
      listeners: Record<string, any> = {};
      postMessage(msg: any) {
        this.listeners['message']({ data: msg * 2 });
      }
      addEventListener(type: 'message' | 'error', cb: any) {
        this.listeners[type] = cb;
      }
      removeEventListener() {}
    }
    const worker = new MockWorker();
    const call = wrapWorker<number, number>(worker as any);
    await expect(call(2)).resolves.toBe(4);
  });

  it('reports progress', async () => {
    class MockWorker {
      listeners: Record<string, any> = {};
      postMessage(msg: any) {
        this.listeners['message']({ data: { progress: 0.5 } });
        this.listeners['message']({ data: msg * 2 });
      }
      addEventListener(type: 'message' | 'error', cb: any) {
        this.listeners[type] = cb;
      }
      removeEventListener() {}
    }
    const worker = new MockWorker();
    const call = wrapWorker<number, number, number>(worker as any);
    const progresses: number[] = [];
    await expect(call(2, { onProgress: (p) => progresses.push(p) })).resolves.toBe(4);
    expect(progresses).toEqual([0.5]);
  });

  it('supports cancellation', async () => {
    class MockWorker {
      listeners: Record<string, any> = {};
      postMessage(_msg: any) {}
      addEventListener(type: 'message' | 'error', cb: any) {
        this.listeners[type] = cb;
      }
      removeEventListener() {}
    }
    const worker = new MockWorker();
    const call = wrapWorker<number, number>(worker as any);
    const controller = new AbortController();
    const promise = call(2, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow('aborted');
  });
});

describe('useToastLogger', () => {
  jest.useFakeTimers();
  it('sets and clears message', () => {
    const { result } = renderHook(() => useToastLogger(100));
    act(() => result.current.toast('hi'));
    expect(result.current.message).toBe('hi');
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current.message).toBeNull();
  });
});
