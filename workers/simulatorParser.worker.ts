export interface ParseMessage {
  action: 'parse';
  text: string;
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

let cancelled = false;
let cancelNotified = false;

const notifyCancelled = () => {
  if (cancelNotified) return;
  cancelNotified = true;
  self.postMessage({ type: 'cancelled' } as SimulatorParserResponse);
};

self.onmessage = ({ data }: MessageEvent<SimulatorParserRequest>) => {
  if (data.action === 'parse') {
    cancelled = false;
    cancelNotified = false;
    const lines = data.text.split(/\r?\n/);
    const total = lines.length;
    const start = Date.now();
    const parsed: ParsedLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) {
        notifyCancelled();
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
        self.postMessage(
          { type: 'progress', progress, eta } as SimulatorParserResponse,
        );
      }
    }
    self.postMessage({ type: 'done', parsed } as SimulatorParserResponse);
  } else if (data.action === 'cancel') {
    cancelled = true;
    notifyCancelled();
  }
};

export {};

