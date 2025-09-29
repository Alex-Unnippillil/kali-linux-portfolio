export interface BenchmarkPresetConfig {
  key: string;
  label: string;
  description: string;
  durationMs: number;
  steps: number;
  speedRange: [number, number];
  recoveredHashes: number;
  sampleLogs: string[];
  scenario: string;
  heavy?: boolean;
}

export interface BenchmarkStartPayload {
  scenario: string;
  durationMs: number;
  steps: number;
  speedRange: [number, number];
  recoveredHashes: number;
  sampleLogs: string[];
}

export type BenchmarkWorkerIncomingMessage =
  | { type: 'start'; payload: BenchmarkStartPayload }
  | { type: 'stop' };

export type BenchmarkWorkerOutgoingMessage =
  | {
      type: 'progress';
      progress: number;
      eta: string;
      speed: number;
      recovered: number;
      log: string;
      scenario: string;
    }
  | {
      type: 'complete';
      recovered: number;
      summary: string;
      scenario: string;
    }
  | { type: 'stopped'; scenario: string };
