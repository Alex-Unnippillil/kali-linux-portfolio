const ctx: Worker = self as any;

import { matchLicense, LicenseMatchResult } from './licenseMatcher';

interface RequestMessage {
  id: string;
  text: string;
}

interface CancelMessage {
  id: string;
  type: 'cancel';
}

interface ResponseMessage {
  id: string;
  result?: LicenseMatchResult;
  error?: string;
  progress?: number;
  duration?: number;
}

const controllers = new Map<string, AbortController>();

ctx.onmessage = (e: MessageEvent<RequestMessage | CancelMessage>) => {
  const data = e.data as any;
  if (data.type === 'cancel') {
    const ctrl = controllers.get(data.id);
    if (ctrl) {
      ctrl.abort();
      controllers.delete(data.id);
    }
    return;
  }

  const { id, text } = data;
  const controller = new AbortController();
  controllers.set(id, controller);
  const start = performance.now();
  try {
    const result = matchLicense(text, {
      signal: controller.signal,
      onProgress(completed, total) {
        const progress = completed / total;
        const msg: ResponseMessage = { id, progress };
        ctx.postMessage(msg);
      },
    });
    const duration = performance.now() - start;
    const msg: ResponseMessage = { id, result, duration };
    ctx.postMessage(msg);
  } catch (err: any) {
    const duration = performance.now() - start;
    const msg: ResponseMessage = {
      id,
      error: err && err.name === 'AbortError' ? 'aborted' : err.message || String(err),
      duration,
    };
    ctx.postMessage(msg);
  } finally {
    controllers.delete(id);
  }
};

export {};
