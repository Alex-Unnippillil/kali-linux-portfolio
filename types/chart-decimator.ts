export type DecimatorStrategy = 'lttb' | 'stride';

export interface ChartPointInput {
  x: number;
  y: number;
  sourceIndex?: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  sourceIndex: number;
}

export interface ChartDecimatorOptions {
  threshold: number;
  strategy?: DecimatorStrategy;
}

export interface ChartDecimatorRequest {
  type: 'decimate';
  id: number;
  points: ChartPoint[];
  threshold: number;
  strategy?: DecimatorStrategy;
}

export interface ChartDecimatorResponse {
  type: 'decimated';
  id: number;
  points: ChartPoint[];
  originalLength: number;
  threshold: number;
  strategy: DecimatorStrategy;
}

export interface ChartDecimatorError {
  type: 'error';
  id?: number;
  message: string;
}

export type ChartDecimatorWorkerMessage =
  | ChartDecimatorResponse
  | ChartDecimatorError
  | { type: 'ready' };

export interface PathProjectPoint {
  x: number;
  y: number;
  sourceIndex: number;
  original: ChartPoint;
}

export interface PathProjectResult {
  d: string;
  projected: PathProjectPoint[];
  xDomain: [number, number];
  yDomain: [number, number];
}
