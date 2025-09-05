"use client";

export type ScreenshotMode = 'region' | 'window' | 'full';

export interface CaptureOptions {
  mode: ScreenshotMode;
  delay: number;
  includePointer: boolean;
  copy?: boolean;
  open?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function captureScreenshot(options: CaptureOptions): Promise<Blob | null> {
  const { mode, delay, includePointer, copy, open } = options;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    return null;
  }
  if (delay > 0) await sleep(delay * 1000);

  const videoOpts: any = { cursor: includePointer ? 'always' : 'never' };
  // Hint desired capture surface; browsers may ignore these.
  if (mode === 'window') videoOpts.displaySurface = 'window';
  else if (mode === 'full') videoOpts.displaySurface = 'monitor';
  else if (mode === 'region') videoOpts.displaySurface = 'browser';

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: videoOpts, audio: false });
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve());
      };
    });
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    stream.getTracks().forEach((t) => t.stop());
    if (!blob) return null;
    if (copy && navigator.clipboard && (navigator as any).clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob }),
        ]);
      } catch {
        /* ignore */
      }
    }
    if (open) {
      const url = URL.createObjectURL(blob);
      window.open(url);
    }
    return blob;
  } catch {
    return null;
  }
}

