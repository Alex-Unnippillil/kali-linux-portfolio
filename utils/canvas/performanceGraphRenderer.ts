import type { RendererMode } from './offscreen';

export interface PerformanceGraphSetupMessage {
  type: 'setup';
  width: number;
  height: number;
  dpr?: number;
  maxPoints?: number;
}

export interface PerformanceGraphSampleMessage {
  type: 'sample';
  delta: number;
}

export interface PerformanceGraphConfigMessage {
  type: 'config';
  prefersReducedMotion: boolean;
}

export interface PerformanceGraphClearMessage {
  type: 'clear';
  value?: number;
}

export interface PerformanceGraphDisposeMessage {
  type: 'dispose';
}

export type PerformanceGraphMessage =
  | PerformanceGraphSetupMessage
  | PerformanceGraphSampleMessage
  | PerformanceGraphConfigMessage
  | PerformanceGraphClearMessage
  | PerformanceGraphDisposeMessage;

export interface PerformanceGraphTelemetry {
  type: 'telemetry';
  mode: Extract<RendererMode, 'offscreen' | 'fallback'>;
  p95: number;
  sampleCount: number;
}

export interface PerformanceGraphRenderer {
  handleMessage: (message: PerformanceGraphMessage) => void;
  dispose: () => void;
}

interface GraphState {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  maxPoints: number;
  points: number[];
  samples: number[];
  prefersReducedMotion: boolean;
  gradient: CanvasGradient | null;
  mode: Extract<RendererMode, 'offscreen' | 'fallback'>;
  emit?: (telemetry: PerformanceGraphTelemetry) => void;
  telemetryCountdown: number;
}

const DEFAULT_MAX_POINTS = 32;
const TELEMETRY_INTERVAL = 24;

const clamp01 = (value: number): number => {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const normaliseDelta = (delta: number): number => {
  const interval = 1000;
  const jitter = Math.min(1, Math.abs(delta - interval) / interval);
  const noise = Math.random() * 0.18;
  return Math.max(0.12, Math.min(1, 0.28 + jitter * 0.6 + noise));
};

const computeP95 = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.95));
  return sorted[index];
};

const drawGraph = (state: GraphState): void => {
  const { ctx, width, height, points } = state;
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9;
  if (state.gradient) {
    ctx.strokeStyle = state.gradient as unknown as string;
  } else {
    ctx.strokeStyle = '#61a3ff';
  }

  ctx.beginPath();
  const step = points.length > 1 ? width / (points.length - 1) : width;
  points.forEach((value, index) => {
    const x = Number((index * step).toFixed(2));
    const y = Number(((1 - clamp01(value)) * height).toFixed(2));
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
};

const ensureGradient = (state: GraphState): void => {
  const { ctx, height } = state;
  if (!ctx || state.gradient) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#61a3ff');
  gradient.addColorStop(1, '#1f4aa8');
  state.gradient = gradient;
};

const updateTelemetry = (state: GraphState): void => {
  if (!state.emit) return;
  if (state.samples.length < state.maxPoints) return;
  state.telemetryCountdown -= 1;
  if (state.telemetryCountdown > 0) return;
  state.telemetryCountdown = TELEMETRY_INTERVAL;
  const p95 = computeP95(state.samples);
  state.emit({
    type: 'telemetry',
    mode: state.mode,
    p95,
    sampleCount: state.samples.length,
  });
};

const pushSample = (state: GraphState, delta: number): void => {
  state.samples.push(delta);
  if (state.samples.length > state.maxPoints * 4) {
    state.samples.shift();
  }
};

export const createPerformanceGraphRenderer = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  emit?: (telemetry: PerformanceGraphTelemetry) => void,
  mode: Extract<RendererMode, 'offscreen' | 'fallback'> = 'fallback'
): PerformanceGraphRenderer => {
  const state: GraphState = {
    ctx,
    width: ctx.canvas.width || 80,
    height: ctx.canvas.height || 18,
    maxPoints: DEFAULT_MAX_POINTS,
    points: [],
    samples: [],
    prefersReducedMotion: false,
    gradient: null,
    mode,
    emit,
    telemetryCountdown: TELEMETRY_INTERVAL,
  };

  const setCanvasSize = (width: number, height: number, dpr: number = 1) => {
    const canvas = ctx.canvas as HTMLCanvasElement | OffscreenCanvas;
    if ('style' in canvas) {
      (canvas as HTMLCanvasElement).style.width = `${width}px`;
      (canvas as HTMLCanvasElement).style.height = `${height}px`;
    }
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    if ('setTransform' in ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    state.width = width;
    state.height = height;
    ensureGradient(state);
    drawGraph(state);
  };

  const handleSetup = (message: PerformanceGraphSetupMessage) => {
    state.maxPoints = message.maxPoints ?? DEFAULT_MAX_POINTS;
    setCanvasSize(message.width, message.height, message.dpr ?? 1);
    if (!state.points.length) {
      state.points = Array.from({ length: state.maxPoints }, (_, index) => 0.32 + (index % 3) * 0.04);
    }
    drawGraph(state);
  };

  const handleSample = (message: PerformanceGraphSampleMessage) => {
    if (state.prefersReducedMotion) return;
    const normalised = normaliseDelta(message.delta);
    state.points.push(normalised);
    if (state.points.length > state.maxPoints) {
      state.points.shift();
    }
    pushSample(state, message.delta);
    drawGraph(state);
    updateTelemetry(state);
  };

  const handleConfig = (message: PerformanceGraphConfigMessage) => {
    state.prefersReducedMotion = message.prefersReducedMotion;
    if (state.prefersReducedMotion) {
      state.samples = [];
      state.points = Array.from({ length: state.maxPoints }, () => 0.28);
    }
    drawGraph(state);
  };

  const handleClear = (message: PerformanceGraphClearMessage) => {
    const filler = message.value ?? 0.28;
    state.points = Array.from({ length: state.maxPoints }, () => filler);
    state.samples = [];
    drawGraph(state);
  };

  return {
    handleMessage(message: PerformanceGraphMessage) {
      switch (message.type) {
        case 'setup':
          handleSetup(message);
          break;
        case 'sample':
          handleSample(message);
          break;
        case 'config':
          handleConfig(message);
          break;
        case 'clear':
          handleClear(message);
          break;
        case 'dispose':
          state.points = [];
          state.samples = [];
          break;
        default:
          break;
      }
    },
    dispose() {
      state.points = [];
      state.samples = [];
      state.gradient = null;
    },
  };
};

export default createPerformanceGraphRenderer;
