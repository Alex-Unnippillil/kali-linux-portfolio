// Example scripts demonstrating the terminal worker

import {
  createTerminalRunRequest,
  parseTerminalWorkerResponse,
} from '../../lib/contracts';

function handleMessage(event: MessageEvent<any>) {
  try {
    const message = parseTerminalWorkerResponse(event.data);
    if (message.type === 'data') {
      console.log(message.chunk);
    }
  } catch {
    // ignore invalid payloads
  }
}

export function uppercaseExample() {
  if (typeof Worker !== 'function') return;
  const worker = new Worker(new URL('../../workers/terminal-worker.ts', import.meta.url));
  worker.onmessage = handleMessage;
  worker.postMessage(
    createTerminalRunRequest({ action: 'run', command: 'echo hello world | upper' }),
  );
}

export function lineCountExample() {
  if (typeof Worker !== 'function') return;
  const worker = new Worker(new URL('../../workers/terminal-worker.ts', import.meta.url));
  const big = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
  worker.onmessage = handleMessage;
  worker.postMessage(
    createTerminalRunRequest({
      action: 'run',
      command: 'cat big.txt | linecount',
      files: { 'big.txt': big },
    }),
  );
}
