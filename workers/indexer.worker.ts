/// <reference lib="webworker" />

import { IndexerEngine, IndexerEngineOptions } from '../utils/indexer-core';

type StartMessage = {
  type: 'start';
  jobId: number;
  directoryHandle: FileSystemDirectoryHandle;
  options?: IndexerEngineOptions;
};

type PauseMessage = { type: 'pause'; jobId: number };
type ResumeMessage = { type: 'resume'; jobId: number };
type CancelMessage = { type: 'cancel'; jobId: number };
type UpdateFileMessage = {
  type: 'update-file';
  jobId: number;
  path: string;
  handle: FileSystemFileHandle;
};

type SearchMessage = {
  type: 'search';
  jobId: number;
  query: string;
  limit?: number;
  requestId: number;
};

type WorkerMessage = StartMessage | PauseMessage | ResumeMessage | CancelMessage | UpdateFileMessage | SearchMessage;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

const engine = new IndexerEngine((event) => {
  ctx.postMessage(event);
});

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;
  switch (message.type) {
    case 'start':
      engine.start(message.directoryHandle, message.jobId, message.options);
      break;
    case 'pause':
      engine.pause(message.jobId);
      break;
    case 'resume':
      engine.resume(message.jobId);
      break;
    case 'cancel':
      engine.cancel(message.jobId);
      break;
    case 'update-file':
      void engine.updateFile(message.path, message.handle);
      break;
    case 'search':
      void engine.search(message.jobId, message.query, message.limit ?? 50, message.requestId);
      break;
    default:
      break;
  }
};

