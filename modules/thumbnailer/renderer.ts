import type { RendererMode } from '../../utils/canvas/offscreen';

export interface ThumbnailRenderMessage {
  type: 'render';
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  dpr?: number;
}

export interface ThumbnailDisposeMessage {
  type: 'dispose';
}

export type ThumbnailMessage = ThumbnailRenderMessage | ThumbnailDisposeMessage;

export interface ThumbnailRenderedResponse {
  type: 'rendered';
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  mode: Extract<RendererMode, 'offscreen' | 'fallback'>;
}

export interface ThumbnailPixelsResponse {
  type: 'pixels';
  id: number;
  imageData: ImageData;
  width: number;
  height: number;
  mode: 'fallback';
}

export interface ThumbnailErrorResponse {
  type: 'error';
  id: number;
  message: string;
}

export type ThumbnailResponse =
  | ThumbnailRenderedResponse
  | ThumbnailPixelsResponse
  | ThumbnailErrorResponse;

export interface ThumbnailRenderer {
  handleMessage: (message: ThumbnailMessage) => void | Promise<void>;
  dispose: () => void;
}

const setCanvasSize = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number
) => {
  if ('style' in canvas) {
    (canvas as HTMLCanvasElement).style.width = `${width}px`;
    (canvas as HTMLCanvasElement).style.height = `${height}px`;
  }
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  if ('setTransform' in ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
};

export const createThumbnailRenderer = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  emit: (response: ThumbnailResponse) => void,
  mode: Extract<RendererMode, 'offscreen' | 'fallback'>
): ThumbnailRenderer => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      handleMessage: () => undefined,
      dispose: () => undefined,
    };
  }

  const handleRender = async (message: ThumbnailRenderMessage) => {
    const { id, bitmap, width, height } = message;
    const dpr = message.dpr ?? 1;
    setCanvasSize(canvas, ctx, width, height, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }

    if (mode === 'offscreen' && 'transferToImageBitmap' in canvas) {
      const result = (canvas as OffscreenCanvas).transferToImageBitmap();
      emit({ type: 'rendered', id, bitmap: result, width, height, mode });
      return;
    }

    if (typeof createImageBitmap === 'function') {
      try {
        const result = await createImageBitmap(canvas as HTMLCanvasElement);
        emit({ type: 'rendered', id, bitmap: result, width, height, mode: 'fallback' });
        return;
      } catch (error) {
        emit({
          type: 'error',
          id,
          message: error instanceof Error ? error.message : 'Failed to create image bitmap',
        });
        return;
      }
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    emit({ type: 'pixels', id, imageData, width, height, mode: 'fallback' });
  };

  return {
    handleMessage(message) {
      if (message.type === 'render') {
        return handleRender(message).catch(error => {
          emit({
            type: 'error',
            id: message.id,
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
      return undefined;
    },
    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
};

export default createThumbnailRenderer;
