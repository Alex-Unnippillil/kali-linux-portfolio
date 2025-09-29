const CONNECT_MESSAGE = '__connect__';
const RELEASE_MESSAGE = '__release__';

export interface ParseMessage {
  action: 'parse';
  buffer: ArrayBuffer;
}

export interface CancelMessage {
  action: 'cancel';
}

export type SimulatorParserRequest = ParseMessage | CancelMessage;

export interface ParsedLine {
  line: number;
  key: string;
  value: string;
  raw: string;
}

export interface ProgressMessage {
  type: 'progress';
  progress: number;
  eta: number;
}

export interface DoneMessage {
  type: 'done';
  parsed: ParsedLine[];
}

export interface CancelledMessage {
  type: 'cancelled';
}

export type SimulatorParserResponse =
  | ProgressMessage
  | DoneMessage
  | CancelledMessage;

const decoder = new TextDecoder();

const connectPort = (port: MessagePort) => {
  let cancelled = false;

  const handleMessage = (event: MessageEvent<SimulatorParserRequest>) => {
    const data = event.data as SimulatorParserRequest & { type?: string };
    if (data && data.type === RELEASE_MESSAGE) {
      cancelled = true;
      port.postMessage({ type: 'cancelled' } as SimulatorParserResponse);
      port.removeEventListener('message', handleMessage as EventListener);
      port.close();
      return;
    }

    if (data.action === 'parse') {
      cancelled = false;
      const text = decoder.decode(data.buffer);
      const lines = text.split(/\r?\n/);
      const total = lines.length || 1;
      const start = Date.now();
      const parsed: ParsedLine[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (cancelled) {
          port.postMessage({ type: 'cancelled' } as SimulatorParserResponse);
          return;
        }
        const line = lines[i];
        const [key, ...rest] = line.split(':');
        parsed.push({
          line: i + 1,
          key: key.trim(),
          value: rest.join(':').trim(),
          raw: line,
        });
        if (i % 100 === 0) {
          const progress = (i + 1) / total;
          const elapsed = Date.now() - start;
          const eta = progress > 0 ? (elapsed * (1 - progress)) / progress : 0;
          port.postMessage({
            type: 'progress',
            progress,
            eta,
          } as SimulatorParserResponse);
        }
      }
      port.postMessage({ type: 'done', parsed } as SimulatorParserResponse);
    } else if (data.action === 'cancel') {
      cancelled = true;
    }
  };

  port.addEventListener('message', handleMessage as EventListener);
  port.start();
};

self.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
  if (event.data?.type === CONNECT_MESSAGE) {
    const [port] = event.ports;
    if (port) {
      connectPort(port);
    }
  }
});

export {};
