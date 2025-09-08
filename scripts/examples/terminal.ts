// Example scripts demonstrating the terminal worker
import { logger } from '../../utils/logger';

export function uppercaseExample() {
  if (typeof Worker !== 'function') return;
  const worker = new Worker(new URL('../../workers/terminal-worker.ts', import.meta.url));
  worker.onmessage = (e: MessageEvent<any>) => {
    const { type, chunk } = e.data || {};
    if (type === 'data') {
      logger.info(chunk);
    }
  };
  worker.postMessage({ action: 'run', command: 'echo hello world | upper' });
}

export function lineCountExample() {
  if (typeof Worker !== 'function') return;
  const worker = new Worker(new URL('../../workers/terminal-worker.ts', import.meta.url));
  const big = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
  worker.onmessage = (e: MessageEvent<any>) => {
    const { type, chunk } = e.data || {};
    if (type === 'data') {
      logger.info(chunk);
    }
  };
  worker.postMessage({
    action: 'run',
    command: 'cat big.txt | linecount',
    files: { 'big.txt': big },
  });
}
