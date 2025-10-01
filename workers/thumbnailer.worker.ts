import {
  createThumbnailRenderer,
  type ThumbnailMessage,
  type ThumbnailResponse,
} from '../modules/thumbnailer/renderer';

let renderer: ReturnType<typeof createThumbnailRenderer> | null = null;

const emit = (response: ThumbnailResponse) => {
  const transfers: Transferable[] = [];
  if (response.type === 'rendered') {
    transfers.push(response.bitmap);
  }
  (self as unknown as Worker).postMessage(response, transfers);
};

self.onmessage = (event: MessageEvent) => {
  const data = event.data as ThumbnailMessage | { type: 'init'; canvas?: OffscreenCanvas };
  if (data.type === 'init' && 'canvas' in data && data.canvas) {
    const ctx = data.canvas.getContext('2d');
    if (!ctx) return;
    renderer = createThumbnailRenderer(data.canvas, emit, 'offscreen');
    return;
  }

  if (!renderer) return;

  if (data.type === 'dispose') {
    renderer.dispose();
    renderer = null;
    return;
  }

  void renderer.handleMessage(data as ThumbnailMessage);
};

export {};
