export type ConversionTarget = "image/png" | "image/jpeg" | "image/webp";

export interface CanvasConversionResult {
  /** Suggested download name including extension */
  name: string;
  /** Blob generated from the canvas conversion */
  blob: Blob;
  /** Original size in bytes */
  originalBytes: number;
  /** Converted size in bytes */
  convertedBytes: number;
  /** Mime type of the converted blob */
  mime: ConversionTarget;
}

const extensionMap: Record<ConversionTarget, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context is not available");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: ConversionTarget,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas conversion produced an empty blob"));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

export async function convertFile(
  file: File,
  mime: ConversionTarget,
  quality: number,
): Promise<CanvasConversionResult> {
  const canvas = await fileToCanvas(file);
  const blob = await canvasToBlob(canvas, mime, quality);
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const name = `${baseName}.${extensionMap[mime]}`;
  return {
    name,
    blob,
    originalBytes: file.size,
    convertedBytes: blob.size,
    mime,
  };
}
