import {
  createPerformanceGraphRenderer,
  type PerformanceGraphMessage,
  type PerformanceGraphTelemetry,
} from '../utils/canvas/performanceGraphRenderer';

let renderer: ReturnType<typeof createPerformanceGraphRenderer> | null = null;

const postTelemetry = (telemetry: PerformanceGraphTelemetry) => {
  (self as unknown as Worker).postMessage(telemetry);
};

self.onmessage = (event: MessageEvent) => {
  const data = event.data as { type: string; canvas?: OffscreenCanvas } & PerformanceGraphMessage;

  if (data.type === 'init' && data.canvas) {
    const ctx = data.canvas.getContext('2d');
    if (ctx) {
      renderer = createPerformanceGraphRenderer(ctx, postTelemetry, 'offscreen');
    }
    return;
  }

  if (!renderer) return;

  if (data.type === 'dispose') {
    renderer.dispose();
    renderer = null;
    return;
  }

  renderer.handleMessage(data);
};

export {};
