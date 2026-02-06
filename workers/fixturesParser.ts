interface ParseMessage {
  type: 'parse';
  text: string;
}

interface CancelMessage {
  type: 'cancel';
}

type IncomingMessage = ParseMessage | CancelMessage;

type ProgressMessage = { type: 'progress'; payload: number };
type ResultMessage = { type: 'result'; payload: any[] };
type CancelledMessage = { type: 'cancelled' };

type OutgoingMessage = ProgressMessage | ResultMessage | CancelledMessage;

const postMessage = (message: OutgoingMessage) =>
  (self as DedicatedWorkerGlobalScope).postMessage(message);

let cancelled = false;

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const { type } = e.data;
  if (type === 'cancel') {
    cancelled = true;
    postMessage({ type: 'cancelled' });
    return;
  }
  if (type === 'parse') {
    const { text } = e.data;
    cancelled = false;
    const lines = text.split(/\n/);
    const total = lines.length || 1;
    const result: any[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (cancelled) {
        return;
      }
      const line = lines[i].trim();
      if (!line) continue;
      try {
        result.push(JSON.parse(line));
      } catch {
        result.push({ line });
      }
      if (i % 100 === 0) {
        postMessage({ type: 'progress', payload: Math.round(((i + 1) / total) * 100) });
      }
    }
    postMessage({ type: 'progress', payload: 100 });
    postMessage({ type: 'result', payload: result });
  }
};

export {}; // ensure module scope
