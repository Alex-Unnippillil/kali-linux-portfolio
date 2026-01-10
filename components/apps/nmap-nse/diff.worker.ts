/// <reference lib="webworker" />
import { computeDiff, DiffRequest } from './diffEngine';

const ctx: DedicatedWorkerGlobalScope = self as any;

ctx.onmessage = (event: MessageEvent<DiffRequest>) => {
  try {
    const payload = event.data || { baseHosts: [], targetHosts: [] };
    const result = computeDiff(payload);
    ctx.postMessage({ result });
  } catch (err: any) {
    ctx.postMessage({ error: err?.message || 'diff-failed' });
  }
};

export {};
