interface CompressMessage {
  id: string;
  type: 'compress';
  file: File;
  format: 'image/jpeg' | 'image/webp';
  quality: number;
  maxDimension: number;
}

interface ProgressMessage {
  id: string;
  type: 'progress';
  progress: number;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  scaleFactor: number;
}

interface CompleteMessage {
  id: string;
  type: 'complete';
  buffer: ArrayBuffer;
  size: number;
  targetWidth: number;
  targetHeight: number;
  format: 'image/jpeg' | 'image/webp';
}

interface ErrorMessage {
  id: string;
  type: 'error';
  message: string;
}

type WorkerResponse = ProgressMessage | CompleteMessage | ErrorMessage;

type WorkerContext = typeof self;

const postResponse = (message: WorkerResponse, transfer?: Transferable[]) => {
  (self as WorkerContext).postMessage(message, transfer ?? []);
};

const clampQuality = (value: number) => {
  if (Number.isNaN(value)) return 0.6;
  return Math.min(0.95, Math.max(0.1, value));
};

self.addEventListener('message', async ({ data }: MessageEvent<CompressMessage>) => {
  if (!data || data.type !== 'compress') return;
  const { id, file, format, maxDimension } = data;
  const quality = clampQuality(data.quality);

  if (!(self as any).createImageBitmap) {
    postResponse({
      id,
      type: 'error',
      message: 'ImageBitmap is not supported in this environment.',
    });
    return;
  }

  try {
    postResponse({
      id,
      type: 'progress',
      progress: 0.1,
      originalWidth: 0,
      originalHeight: 0,
      targetWidth: 0,
      targetHeight: 0,
      scaleFactor: 1,
    });

    const bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    postResponse({
      id,
      type: 'progress',
      progress: 0.45,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      targetWidth,
      targetHeight,
      scaleFactor: scale,
    });

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close?.();
      throw new Error('OffscreenCanvas 2D context is not available.');
    }
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    postResponse({
      id,
      type: 'progress',
      progress: 0.75,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      targetWidth,
      targetHeight,
      scaleFactor: scale,
    });

    const blob = await canvas.convertToBlob({ type: format, quality });
    const buffer = await blob.arrayBuffer();
    postResponse(
      {
        id,
        type: 'complete',
        buffer,
        size: blob.size,
        targetWidth,
        targetHeight,
        format,
      },
      [buffer],
    );
  } catch (error) {
    postResponse({
      id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Compression failed',
    });
  }
});

export {};
