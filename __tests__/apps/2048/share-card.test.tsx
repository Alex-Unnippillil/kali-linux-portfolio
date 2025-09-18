import * as Share from '../../../apps/2048/share';

describe('2048 share card', () => {
  const board = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2048, 0],
    [0, 0, 0, 0],
  ];

  const setupCanvasMock = () => {
    const fillRect = jest.fn();
    const fillText = jest.fn();
    const context: Partial<CanvasRenderingContext2D> = {
      fillRect,
      fillText,
      measureText: jest.fn(),
      textAlign: 'center',
      textBaseline: 'top',
      font: '',
      fillStyle: '#000',
    };

    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn().mockReturnValue(context),
      toBlob: jest.fn((callback: BlobCallback) => {
        callback(new Blob(['mock'], { type: 'image/png' }));
      }),
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,'),
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);
    const anchors: HTMLAnchorElement[] = [];
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return canvas;
      }
      if (tag === 'a') {
        const anchor = originalCreateElement(tag) as HTMLAnchorElement;
        jest.spyOn(anchor, 'click').mockImplementation(() => {});
        anchors.push(anchor);
        return anchor;
      }
      return originalCreateElement(tag);
    });

    return { canvas, context, fillRect, fillText, createElementSpy, anchors };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).ClipboardItem;
    if (Object.getOwnPropertyDescriptor(navigator, 'clipboard')?.configurable) {
      delete (navigator as any).clipboard;
    }
  });

  it('creates a PNG rendering of the final board and score', async () => {
    const { canvas, fillRect, fillText } = setupCanvasMock();

    const blob = await Share.createShareImage({
      board,
      score: 4096,
      boardType: 'classic',
      status: 'won',
    });

    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(fillRect).toHaveBeenCalled();
    expect(fillText).toHaveBeenCalledWith(expect.stringContaining('Score'), expect.any(Number), expect.any(Number));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('uses the clipboard when available', async () => {
    const { createElementSpy, anchors } = setupCanvasMock();
    const write = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write },
    });
    const clipboardItem = jest.fn();
    (window as any).ClipboardItem = clipboardItem;

    const result = await Share.shareGameResult({
      board,
      score: 2048,
      boardType: 'classic',
      status: 'lost',
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(clipboardItem).toHaveBeenCalledTimes(1);
    expect(result.action).toBe('copied');
    expect(anchors).toHaveLength(0);

    createElementSpy.mockRestore();
  });

  it('downloads the PNG when the clipboard is unavailable', async () => {
    const { createElementSpy, anchors } = setupCanvasMock();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURLSpy = jest.fn().mockReturnValue('blob:test-url');
    const revokeObjectURLSpy = jest.fn();
    (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
      createObjectURLSpy as unknown as typeof URL.createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
      revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

    const result = await Share.shareGameResult({
      board,
      score: 1024,
      boardType: 'hex',
      status: 'won',
    });

    expect(anchors.length).toBeGreaterThan(0);
    expect((anchors[0].click as jest.Mock).mock.calls).toHaveLength(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(result.action).toBe('downloaded');

    if (originalCreateObjectURL) {
      (URL as any).createObjectURL = originalCreateObjectURL;
    } else {
      delete (URL as any).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      (URL as any).revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete (URL as any).revokeObjectURL;
    }
    createElementSpy.mockRestore();
  });
});
