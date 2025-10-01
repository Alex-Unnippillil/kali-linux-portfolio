import {
  ChartDecimatorRequest,
  ChartDecimatorWorkerMessage,
} from '../types/chart-decimator';
import {
  decimatePoints,
  normalizePoints,
} from '../utils/charting/decimator';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.postMessage({ type: 'ready' });

ctx.onmessage = (event: MessageEvent<ChartDecimatorRequest>) => {
  const data = event.data;
  if (!data || data.type !== 'decimate') {
    return;
  }

  try {
    const normalized = normalizePoints(data.points);
    const decimated = decimatePoints(normalized, {
      threshold: data.threshold,
      strategy: data.strategy,
    });

    const response: ChartDecimatorWorkerMessage = {
      type: 'decimated',
      id: data.id,
      points: decimated,
      originalLength: normalized.length,
      threshold: data.threshold,
      strategy: data.strategy ?? 'lttb',
    };

    ctx.postMessage(response);
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      id: data.id,
      message: error instanceof Error ? error.message : 'Failed to decimate series',
    });
  }
};
