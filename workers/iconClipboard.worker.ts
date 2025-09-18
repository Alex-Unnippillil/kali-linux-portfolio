interface IconRequestMessage {
  id: number;
  url: string;
  format: 'original' | 'png';
}

interface IconResponseMessage {
  id: number;
  success: boolean;
  error?: string;
  blob?: Blob;
}

const toBlob = (canvas: OffscreenCanvas): Promise<Blob> => {
  const anyCanvas = canvas as OffscreenCanvas & {
    toBlob?: (callback: BlobCallback, type?: string, quality?: number) => void;
  };

  if (typeof anyCanvas.toBlob !== 'function' && 'convertToBlob' in canvas) {
    anyCanvas.toBlob = (callback: BlobCallback, type?: string, quality?: number) => {
      canvas
        .convertToBlob({ type, quality })
        .then((blob) => callback(blob))
        .catch(() => callback(null));
    };
  }

  return new Promise<Blob>((resolve, reject) => {
    if (typeof anyCanvas.toBlob !== 'function') {
      reject(new Error('toBlob not supported in worker'));
      return;
    }
    anyCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
};

const resolveUrl = (input: string): string => {
  try {
    return new URL(input, self.location.origin).toString();
  } catch {
    return input;
  }
};

self.onmessage = async ({ data }: MessageEvent<IconRequestMessage>) => {
  const { id, url, format } = data;
  try {
    const response = await fetch(resolveUrl(url));
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }

    const blob = await response.blob();
    if (format === 'original') {
      (self as any).postMessage(
        { id, success: true, blob } as IconResponseMessage,
        [blob],
      );
      return;
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width || 1, bitmap.height || 1);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context unavailable');
    }
    context.drawImage(bitmap, 0, 0);
    const pngBlob = await toBlob(canvas);
    (self as any).postMessage(
      { id, success: true, blob: pngBlob } as IconResponseMessage,
      [pngBlob],
    );
  } catch (error) {
    (self as any).postMessage({
      id,
      success: false,
      error: (error as Error).message,
    } as IconResponseMessage);
  }
};

export {};
