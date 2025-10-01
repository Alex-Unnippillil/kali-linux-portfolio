import { runDiff } from '../utils/diff/workerPool';
import type {
  DiffWorkerRequestMessage,
  DiffWorkerResponseMessage,
} from '../utils/diff/types';

declare const self: DedicatedWorkerGlobalScope;

const cancelledJobs = new Set<string>();

const postMessageTyped = (message: DiffWorkerResponseMessage) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

self.onmessage = (event: MessageEvent<DiffWorkerRequestMessage>) => {
  const message = event.data;
  if (!message) return;
  if (message.type === 'cancel') {
    cancelledJobs.add(message.id);
    return;
  }

  if (message.type === 'diff') {
    const { id, mode, payload } = message;
    try {
      const result = runDiff(mode, payload as never);
      if (cancelledJobs.has(id)) {
        cancelledJobs.delete(id);
        postMessageTyped({ id, status: 'cancelled' });
        return;
      }
      postMessageTyped({ id, status: 'success', mode, result });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to compute diff';
      postMessageTyped({ id: message.id, status: 'error', error: messageText });
    } finally {
      cancelledJobs.delete(message.id);
    }
  }
};

export {};
