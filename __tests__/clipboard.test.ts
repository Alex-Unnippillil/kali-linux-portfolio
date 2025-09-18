import type { ClipboardResult } from '../utils/clipboard';

describe('clipboard utilities', () => {
  const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'clipboard',
  );
  const originalWorker = global.Worker;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    } else {
      delete (navigator as any).clipboard;
    }
    global.Worker = originalWorker as any;
  });

  const setupClipboard = (overrides: Partial<Clipboard> = {}) => {
    const clipboardMock: Clipboard = {
      writeText: jest.fn(() => Promise.resolve()),
      readText: jest.fn(),
      write: jest.fn(() => Promise.resolve()),
      read: jest.fn(),
      ...overrides,
    } as unknown as Clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: clipboardMock,
    });
    return clipboardMock;
  };

  const createWorkerStub = () => {
    class MockWorker {
      onmessage: ((event: MessageEvent<any>) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      constructor() {}
      postMessage(data: { id: number; format: 'original' | 'png' }) {
        const { id, format } = data;
        setTimeout(() => {
          const type = format === 'png' ? 'image/png' : 'image/svg+xml';
          const blob = new Blob(['icon'], { type });
          this.onmessage?.({
            data: { id, success: true, blob },
          } as MessageEvent<{ id: number; success: boolean; blob: Blob }>);
        }, 0);
      }
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
    }
    global.Worker = MockWorker as any;
  };

  beforeAll(() => {
    class MockClipboardItem {
      types: string[];
      data: Record<string, Blob>;
      constructor(items: Record<string, Blob>) {
        this.types = Object.keys(items);
        this.data = items;
      }
    }
    (global as any).ClipboardItem = MockClipboardItem;
  });

  afterAll(() => {
    (global as any).ClipboardItem = undefined;
  });

  it('copies text using the Clipboard API', async () => {
    const clipboard = setupClipboard({
      writeText: jest.fn(() => Promise.resolve()),
    });
    const { copyTextDetailed } = await import('../utils/clipboard');
    const result = await copyTextDetailed('hello world');
    expect(clipboard.writeText).toHaveBeenCalledWith('hello world');
    expect(result.success).toBe(true);
  });

  it('reports permission errors from writeText', async () => {
    const error = new DOMException('Denied', 'NotAllowedError');
    setupClipboard({
      writeText: jest.fn(() => Promise.reject(error)),
    });
    const { copyTextDetailed } = await import('../utils/clipboard');
    const result = (await copyTextDetailed('denied')) as ClipboardResult;
    expect(result.success).toBe(false);
    expect(result.reason).toBe('permission-denied');
  });

  it('copies icon blobs through the worker pipeline', async () => {
    const clipboard = setupClipboard({
      write: jest.fn(() => Promise.resolve()),
    });
    createWorkerStub();
    const { copyIconsToClipboard } = await import('../utils/clipboard');
    const result = await copyIconsToClipboard(['/icon.svg']);
    expect(result.success).toBe(true);
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    const items = clipboard.write.mock.calls[0][0];
    expect(items).toHaveLength(1);
    const item = items[0] as any;
    expect(item.types).toContain('image/svg+xml');
  });

  it('propagates permission errors when copying icons as PNG', async () => {
    const error = new DOMException('Denied', 'NotAllowedError');
    const clipboard = setupClipboard({
      write: jest.fn(() => Promise.reject(error)),
    });
    createWorkerStub();
    const { copyIconsAsPng } = await import('../utils/clipboard');
    const result = await copyIconsAsPng(['/icon.svg']);
    expect(clipboard.write).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('permission-denied');
  });
});
