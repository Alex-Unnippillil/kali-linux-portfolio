import setupCanvasRenderer, {
  type RendererController,
  type RendererMode,
} from '../../utils/canvas/offscreen';
import {
  createThumbnailRenderer,
  type ThumbnailMessage,
  type ThumbnailResponse,
  type ThumbnailRenderedResponse,
  type ThumbnailPixelsResponse,
  type ThumbnailErrorResponse,
} from './renderer';

type PendingRequest = {
  resolve: (value: ThumbnailResult) => void;
  reject: (reason?: unknown) => void;
};

let controller: RendererController<ThumbnailMessage> | null = null;
let hiddenCanvas: HTMLCanvasElement | null = null;
let currentMode: RendererMode = 'none';
let nextId = 0;
const pending = new Map<number, PendingRequest>();

export interface ThumbnailResult {
  width: number;
  height: number;
  bitmap?: ImageBitmap;
  imageData?: ImageData;
  mode: 'offscreen' | 'fallback';
}

const ensureCanvas = (): HTMLCanvasElement => {
  if (hiddenCanvas) return hiddenCanvas;
  if (typeof document === 'undefined') {
    throw new Error('Cannot create canvas outside the browser');
  }
  hiddenCanvas = document.createElement('canvas');
  return hiddenCanvas;
};

const handleRenderedResponse = (response: ThumbnailRenderedResponse) => {
  const entry = pending.get(response.id);
  if (!entry) return;
  pending.delete(response.id);
  entry.resolve({
    width: response.width,
    height: response.height,
    bitmap: response.bitmap,
    mode: response.mode,
  });
};

const handlePixelsResponse = (response: ThumbnailPixelsResponse) => {
  const entry = pending.get(response.id);
  if (!entry) return;
  pending.delete(response.id);

  const complete = (bitmap?: ImageBitmap) => {
    entry.resolve({
      width: response.width,
      height: response.height,
      bitmap,
      imageData: bitmap ? undefined : response.imageData,
      mode: 'fallback',
    });
  };

  if (typeof createImageBitmap === 'function') {
    createImageBitmap(response.imageData)
      .then(result => {
        complete(result);
      })
      .catch(() => {
        complete(undefined);
      });
  } else {
    complete(undefined);
  }
};

const handleErrorResponse = (response: ThumbnailErrorResponse) => {
  const entry = pending.get(response.id);
  if (!entry) return;
  pending.delete(response.id);
  entry.reject(new Error(response.message));
};

const handleMessage = (event: MessageEvent<ThumbnailResponse>) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'rendered') {
    handleRenderedResponse(data);
  } else if (data.type === 'pixels') {
    handlePixelsResponse(data);
  } else if (data.type === 'error') {
    handleErrorResponse(data);
  }
};

const createFallbackRenderer = (
  canvas: HTMLCanvasElement,
  emit: (response: ThumbnailResponse) => void
) => {
  const renderer = createThumbnailRenderer(canvas, emit, 'fallback');
  return {
    handleMessage(message: ThumbnailMessage) {
      return renderer.handleMessage(message);
    },
    dispose() {
      renderer.dispose();
    },
  };
};

const ensureController = async (): Promise<RendererController<ThumbnailMessage>> => {
  if (controller) return controller;
  const canvas = ensureCanvas();
  controller = setupCanvasRenderer<ThumbnailMessage, ThumbnailResponse>({
    canvas,
    createWorker: () => new Worker(new URL('../../workers/thumbnailer.worker.ts', import.meta.url)),
    onMessage: handleMessage,
    fallback: (cnv, emit) => createFallbackRenderer(cnv, emit),
  });
  currentMode = controller.mode;
  return controller;
};

export const renderThumbnail = async (
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<ThumbnailResult> => {
  const ctrl = await ensureController();
  const id = ++nextId;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const payload: ThumbnailMessage = {
    type: 'render',
    id,
    bitmap,
    width,
    height,
    dpr,
  };

  return new Promise<ThumbnailResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      ctrl.postMessage(payload, [bitmap]);
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
};

export const disposeThumbnailer = (): void => {
  controller?.dispose();
  controller = null;
  if (hiddenCanvas) {
    hiddenCanvas.width = 0;
    hiddenCanvas.height = 0;
    hiddenCanvas = null;
  }
  pending.forEach(entry => {
    entry.reject(new Error('Thumbnailer disposed'));
  });
  pending.clear();
  currentMode = 'none';
};

export const getThumbnailerMode = (): RendererMode => currentMode;

export default renderThumbnail;
