export const createAIWorker = () =>
  new Worker(new URL('./ai.worker.ts', import.meta.url));
