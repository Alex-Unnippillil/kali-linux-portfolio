'use client';

import type { Options as Html2CanvasOptions } from 'html2canvas';

import {
  ScreenshotTemplateContext,
  formatScreenshotName,
  readStoredTemplate,
} from '@/utils/capture/screenshotNames';

export type ScreenshotImageFormat = 'png' | 'jpeg';

export interface ScreenshotCaptureOptions {
  /** Element or selector to capture. Defaults to document.documentElement. */
  target?: HTMLElement | string;
  /** Override the stored filename template. */
  template?: string;
  /** Context applied to template variables. */
  context?: ScreenshotTemplateContext;
  /** Image output format. Defaults to png. */
  format?: ScreenshotImageFormat;
  /** Quality value forwarded to canvas.toBlob when format is jpeg. */
  quality?: number;
  /** html2canvas background colour. Pass null to keep transparency. */
  backgroundColor?: string | null;
  /** Optional scale override for html2canvas. */
  scale?: number;
  /** Skip the automatic download when false. */
  download?: boolean;
  /** Additional html2canvas overrides. */
  canvasOptions?: Partial<Html2CanvasOptions>;
}

export interface ScreenshotCaptureResult {
  filename: string;
  blob: Blob;
}

const formatToMime = (format: ScreenshotImageFormat) =>
  format === 'jpeg' ? 'image/jpeg' : 'image/png';

const formatToExtension = (format: ScreenshotImageFormat) =>
  (format === 'jpeg' ? 'jpg' : 'png');

const getDocument = (): Document | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as { document?: Document }).document;
};

const getDevicePixelRatio = () => {
  if (typeof globalThis === 'undefined') return 1;
  const candidate = globalThis as { devicePixelRatio?: number };
  return candidate.devicePixelRatio ?? 1;
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  format: ScreenshotImageFormat,
  quality?: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create screenshot blob.'));
          return;
        }
        resolve(blob);
      },
      formatToMime(format),
      quality,
    );
  });

const resolveTarget = (
  target: HTMLElement | string | null | undefined,
  doc: Document,
) => {
  if (!target) return doc.documentElement;
  if (typeof target === 'string') {
    return doc.querySelector(target) as HTMLElement | null;
  }
  return target;
};

export const captureScreenshot = async (
  options: ScreenshotCaptureOptions = {},
): Promise<ScreenshotCaptureResult> => {
  const doc = getDocument();
  if (!doc) {
    throw new Error('captureScreenshot can only run in a browser context.');
  }

  const element = resolveTarget(options.target, doc);
  if (!element) {
    throw new Error('Unable to resolve a capture target element.');
  }

  const { default: html2canvas } = await import('html2canvas');

  const format = options.format ?? 'png';
  const now = options.context?.now ?? new Date();
  const context: ScreenshotTemplateContext = { ...options.context, now };
  const template = options.template ?? readStoredTemplate();

  const canvas = await html2canvas(element, {
    backgroundColor:
      options.backgroundColor === undefined
        ? '#0B0B0B'
        : options.backgroundColor,
    useCORS: true,
    logging: false,
    scale: options.scale ?? getDevicePixelRatio(),
    ...options.canvasOptions,
  });

  const blob = await canvasToBlob(canvas, format, options.quality);
  const filename = formatScreenshotName(
    template,
    context,
    formatToExtension(format),
  );

  if (options.download ?? true) {
    const url = URL.createObjectURL(blob);
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return { blob, filename };
};

export default captureScreenshot;
