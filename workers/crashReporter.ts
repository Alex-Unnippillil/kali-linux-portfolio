import { createCrashReport } from '../modules/crash/reporting';
import type { CrashPayload, CrashReport } from '../modules/crash/reporting';

type WorkerRequest =
  | { type: 'report-crash'; payload: CrashPayload };

type WorkerResponse =
  | { type: 'crash-report'; report: CrashReport }
  | { type: 'crash-report-error'; error: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || message.type !== 'report-crash') {
    return;
  }

  try {
    const report = createCrashReport(message.payload);
    self.postMessage({ type: 'crash-report', report } as WorkerResponse);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Failed to create crash report';
    self.postMessage({ type: 'crash-report-error', error: messageText } as WorkerResponse);
  }
};

export {};
