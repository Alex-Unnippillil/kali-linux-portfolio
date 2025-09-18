/// <reference lib="webworker" />

import { createReportBundle, DEFAULT_REPORT_TEMPLATE, type ReportFontSet, type ReportPayload } from '../modules/reporting/pipeline';

type WorkerRequest = ReportPayload;

interface WorkerSuccessMessage {
  html: string;
  pdf: ArrayBuffer;
}

interface WorkerErrorMessage {
  error: string;
}

type FontEntry = [keyof ReportFontSet, string];

const FONT_FILES: FontEntry[] = [
  ['regular', '/fonts/Inter-Regular.ttf'],
  ['bold', '/fonts/Inter-Bold.ttf'],
  ['italic', '/fonts/Inter-Italic.ttf'],
  ['mono', '/fonts/FiraCode-Regular.ttf'],
];

let fontCache: Promise<ReportFontSet> | null = null;

async function loadFonts(): Promise<ReportFontSet> {
  if (!fontCache) {
    fontCache = (async () => {
      const entries = await Promise.all(
        FONT_FILES.map(async ([key, url]) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to load font: ${url}`);
          }
          const buffer = await response.arrayBuffer();
          return [key, new Uint8Array(buffer)] as const;
        }),
      );
      return Object.fromEntries(entries) as ReportFontSet;
    })();
  }
  return fontCache;
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;
  if (!payload || typeof payload.markdown !== 'string') {
    ctx.postMessage({ error: 'Invalid payload' } satisfies WorkerErrorMessage);
    return;
  }

  try {
    const fonts = await loadFonts();
    const result = await createReportBundle(
      {
        markdown: payload.markdown,
        template: payload.template ?? DEFAULT_REPORT_TEMPLATE,
        metadata: payload.metadata,
      },
      fonts,
    );

    const pdfBuffer = result.pdf.buffer.slice(result.pdf.byteOffset, result.pdf.byteOffset + result.pdf.byteLength);
    const message: WorkerSuccessMessage = { html: result.html, pdf: pdfBuffer };
    ctx.postMessage(message, [pdfBuffer]);
  } catch (error) {
    const message: WorkerErrorMessage = {
      error: error instanceof Error ? error.message : 'Failed to build report',
    };
    ctx.postMessage(message);
  }
};
