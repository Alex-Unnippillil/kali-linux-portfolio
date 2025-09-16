import QRCode from 'qrcode';
import type { QRCodeToStringOptions } from 'qrcode';

import { WorkerPool, type WorkerPoolTask } from './workerPool';

export interface QrEncodeMessage {
  text: string;
  opts: QRCodeToStringOptions;
}

export interface QrEncodeResult {
  png: string;
  svg: string;
}

const createQrWorker = () =>
  new Worker(new URL('../../workers/qrEncode.worker.ts', import.meta.url));

const qrPool = new WorkerPool<QrEncodeMessage, QrEncodeResult>({
  size: 2,
  createWorker: createQrWorker,
});

const isQrResult = (data: unknown): data is QrEncodeResult =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as { png?: unknown }).png === 'string' &&
  typeof (data as { svg?: unknown }).svg === 'string';

export const queueQrEncode = (
  text: string,
  opts: QRCodeToStringOptions,
): WorkerPoolTask<QrEncodeResult> =>
  qrPool.runTask(
    { text, opts },
    {
      resolve: (data) => (isQrResult(data) ? data : undefined),
      fallback: async () => {
        const value = text || ' ';
        const png = await QRCode.toDataURL(value, opts);
        const svg = await QRCode.toString(value, { ...(opts as any), type: 'svg' });
        return { png, svg };
      },
    },
  );

