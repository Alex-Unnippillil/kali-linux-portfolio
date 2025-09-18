import { DEFAULT_REPORT_TEMPLATE, type ReportBundle, type ReportPayload } from './pipeline';

type ExporterPayload = Pick<ReportPayload, 'markdown' | 'template' | 'metadata'>;

interface WorkerSuccessMessage {
  html: string;
  pdf: ArrayBuffer;
}

interface WorkerErrorMessage {
  error: string;
}

export interface GenerateReportOptions {
  markdown: string;
  template?: string;
  metadata?: ReportPayload['metadata'];
}

export interface GenerateReportResult {
  html: string;
  pdf: Uint8Array;
}

let workerPromise: Promise<Worker> | null = null;

function spawnWorker(): Worker {
  return new Worker(new URL('../../workers/report-export.worker.ts', import.meta.url));
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = Promise.resolve(spawnWorker());
  }
  return workerPromise;
}

function toPayload(options: GenerateReportOptions): ExporterPayload {
  return {
    markdown: options.markdown,
    template: options.template ?? DEFAULT_REPORT_TEMPLATE,
    metadata: options.metadata,
  };
}

async function callApi(payload: ExporterPayload): Promise<GenerateReportResult> {
  const response = await fetch('/api/reports/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  const data = (await response.json()) as ReportBundle & { pdfBase64: string };
  if (!data.pdfBase64 || typeof data.html !== 'string') {
    throw new Error('Malformed export response');
  }
  return {
    html: data.html,
    pdf: decodeBase64(data.pdfBase64),
  };
}

async function callWorker(payload: ExporterPayload): Promise<GenerateReportResult> {
  const worker = await getWorker();
  return new Promise<GenerateReportResult>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerSuccessMessage | WorkerErrorMessage>) => {
      worker.removeEventListener('message', handleMessage as EventListener);
      worker.removeEventListener('error', handleError);
      const message = event.data;
      if ('error' in message) {
        reject(new Error(message.error));
        return;
      }
      resolve({ html: message.html, pdf: new Uint8Array(message.pdf) });
    };

    const handleError = (event: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage as EventListener);
      worker.removeEventListener('error', handleError);
      reject(event.error ?? new Error('Worker failure'));
    };

    worker.addEventListener('message', handleMessage as EventListener);
    worker.addEventListener('error', handleError);
    worker.postMessage(payload);
  });
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  throw new Error('No base64 decoder available');
}

export async function generateReport(options: GenerateReportOptions): Promise<GenerateReportResult> {
  const payload = toPayload(options);
  const shouldUseWorkerFirst = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (shouldUseWorkerFirst) {
    try {
      return await callWorker(payload);
    } catch {
      // Fall through to API attempt if worker fails in offline detection edge cases
    }
  }

  try {
    return await callApi(payload);
  } catch (apiError) {
    return callWorker(payload);
  }
}

export function destroyReportWorker() {
  if (!workerPromise) return;
  workerPromise.then((worker) => worker.terminate()).catch(() => undefined);
  workerPromise = null;
}
