export const INVADER_COLUMNS = 8;
export const INVADER_SPACING = 30;
export const BASE_INVADER_ROWS = 4;
export const DEFAULT_LIVES = 3;
export const EXTRA_LIFE_THRESHOLDS = [1000, 5000, 10000] as const;
export const BOSS_EVERY = 3;
export const MAX_SHIELD_HP = 3;

export interface Invader {
  x: number;
  y: number;
  alive: boolean;
  phase: number;
}

export interface ShieldTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

export interface UFO {
  active: boolean;
  x: number;
  y: number;
  dir: number;
}

export interface GameState {
  stage: number;
  invaders: Invader[];
  shields: ShieldTile[];
  ufo: UFO;
}

export interface WaveOptions {
  offsetX?: number;
  offsetY?: number;
  spacing?: number;
  phaseGenerator?: () => number;
}

const defaultPhase = () => Math.random() * Math.PI * 2;

export const createWave = (
  stage: number,
  {
    offsetX = 30,
    offsetY = 30,
    spacing = INVADER_SPACING,
    phaseGenerator = defaultPhase,
  }: WaveOptions = {},
): Invader[] => {
  const safeStage = Math.max(1, Math.floor(stage));
  const rows = BASE_INVADER_ROWS + (safeStage - 1);
  const invaders: Invader[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < INVADER_COLUMNS; c += 1) {
      invaders.push({
        x: offsetX + c * spacing,
        y: offsetY + r * spacing,
        alive: true,
        phase: phaseGenerator(),
      });
    }
  }
  return invaders;
};

export const createGame = (
  stage = 1,
  options?: WaveOptions,
): GameState => ({
  stage: Math.max(1, Math.floor(stage)),
  invaders: createWave(stage, options),
  shields: [],
  ufo: { active: false, x: 0, y: 15, dir: 1 },
});

export const advanceWave = (state: GameState, options?: WaveOptions) => {
  if (state.invaders.every((i) => !i.alive)) {
    state.stage += 1;
    state.invaders = createWave(state.stage, options);
    state.ufo.active = false;
  }
};

export const spawnUFO = (state: GameState) => {
  state.ufo = { active: true, x: 0, y: 15, dir: 1 };
};

export interface ProgressSnapshot {
  stage: number;
  score: number;
  lives: number;
}

export const normalizeProgress = (
  snapshot?: Partial<ProgressSnapshot> | null,
): ProgressSnapshot => {
  const stage = Math.max(1, Math.floor(snapshot?.stage ?? 1));
  const score = Math.max(0, Math.floor(snapshot?.score ?? 0));
  const rawLives = Math.floor(snapshot?.lives ?? DEFAULT_LIVES);
  const lives = rawLives >= 1 ? rawLives : DEFAULT_LIVES;
  return { stage, score, lives };
};

export const computeExtraLifeIndex = (score: number) => {
  return EXTRA_LIFE_THRESHOLDS.filter((threshold) => score >= threshold).length;
};
