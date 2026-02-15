import { GRID_SIZE } from '../../apps/snake';

const REPLAY_ENGINE_VERSION = 2;

export interface ReplayInput {
  stepIndex: number;
  dir: { x: number; y: number };
}

export interface ReplaySettings {
  wrap?: boolean;
  obstaclesEnabled?: boolean;
  obstaclePack?: Array<{ x: number; y: number }>;
  baseSpeed?: number;
  skinId?: string;
  colorblind?: boolean;
}

export interface ReplayMetadata {
  finalScore?: number;
  createdAt?: string;
  gridSize?: number;
  wrap?: boolean;
  obstaclesEnabled?: boolean;
  baseSpeed?: number;
  skinId?: string;
  colorblind?: boolean;
  engineVersion?: number;
  name?: string;
}

export interface SnakeReplay {
  seed?: string;
  settings?: ReplaySettings;
  inputs?: ReplayInput[];
  frames?: Array<any>;
  metadata?: ReplayMetadata;
}

export const isDirection = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== 'object') return false;
  const dir = value as { x?: unknown; y?: unknown };
  return typeof dir.x === 'number' && typeof dir.y === 'number';
};

const isReplayInput = (value: unknown): value is ReplayInput => {
  if (!value || typeof value !== 'object') return false;
  const input = value as { stepIndex?: unknown; dir?: unknown };
  return Number.isInteger(input.stepIndex) && isDirection(input.dir);
};

const isPointArray = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as { x?: unknown }).x === 'number' &&
      typeof (item as { y?: unknown }).y === 'number',
  );

export const validateReplayData = (raw: unknown): SnakeReplay | null => {
  if (!raw || typeof raw !== 'object') return null;
  const replay = raw as SnakeReplay;

  const hasFrames = Array.isArray(replay.frames);
  const hasInputs = Array.isArray(replay.inputs);
  if (!hasFrames && !hasInputs) return null;
  if (hasInputs && !replay.inputs!.every(isReplayInput)) return null;

  if (replay.settings) {
    if (typeof replay.settings !== 'object') return null;
    const settings = replay.settings;
    if (
      settings.obstaclePack !== undefined &&
      !isPointArray(settings.obstaclePack)
    ) {
      return null;
    }
  }

  if (replay.metadata && typeof replay.metadata !== 'object') return null;

  return replay;
};

export const buildReplayMetadata = ({
  score,
  wrap,
  obstaclesEnabled,
  baseSpeed,
  skinId,
  colorblind,
  name,
}: {
  score: number;
  wrap: boolean;
  obstaclesEnabled: boolean;
  baseSpeed: number;
  skinId: string;
  colorblind: boolean;
  name?: string;
}): ReplayMetadata => ({
  finalScore: score,
  createdAt: new Date().toISOString(),
  gridSize: GRID_SIZE,
  wrap,
  obstaclesEnabled,
  baseSpeed,
  skinId,
  colorblind,
  engineVersion: REPLAY_ENGINE_VERSION,
  ...(name ? { name } : {}),
});

const formatDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const replayLabel = (name: string, replay: SnakeReplay | null): string => {
  if (!replay) return name;
  const metadata = replay.metadata ?? {};
  const settings = replay.settings ?? {};
  const score = metadata.finalScore ?? replay.frames?.[replay.frames.length - 1]?.score ?? 0;
  const wrap = metadata.wrap ?? settings.wrap;
  const obstaclesEnabled = metadata.obstaclesEnabled ?? settings.obstaclesEnabled;
  const labelName = metadata.name?.trim() || name;
  return `${labelName} • ${formatDate(metadata.createdAt)} • Score ${score} • Wrap ${
    wrap ? 'On' : 'Off'
  } • Obstacles ${obstaclesEnabled ? 'On' : 'Off'}`;
};

export const parseReplayImport = (jsonText: string): SnakeReplay | null => {
  try {
    const parsed = JSON.parse(jsonText);
    return validateReplayData(parsed);
  } catch {
    return null;
  }
};

export const normalizeReplayForSave = (
  replay: SnakeReplay,
  fallbackName?: string,
): SnakeReplay => {
  const metadata = replay.metadata ?? {};
  return {
    ...replay,
    metadata: {
      ...metadata,
      engineVersion: metadata.engineVersion ?? REPLAY_ENGINE_VERSION,
      gridSize: metadata.gridSize ?? GRID_SIZE,
      createdAt: metadata.createdAt ?? new Date().toISOString(),
      name: metadata.name ?? fallbackName,
    },
  };
};
