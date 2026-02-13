import { buildDiff, collectDiffStats, type DirEntry, type DiffNode, type DiffStats } from './dirDiffUtils';

interface WorkerMessage {
  left?: DirEntry | null;
  right?: DirEntry | null;
}

interface WorkerResponse {
  diff: DiffNode | null;
  stats: DiffStats;
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const { left = null, right = null } = event.data || {};
    const diff = buildDiff(left ?? null, right ?? null);
    const stats = collectDiffStats(diff);
    const payload: WorkerResponse = {
      diff,
      stats,
    };
    ctx.postMessage(payload);
  } catch (error) {
    ctx.postMessage({
      diff: null,
      stats: collectDiffStats(null),
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse & { error: string });
  }
};

export {};
