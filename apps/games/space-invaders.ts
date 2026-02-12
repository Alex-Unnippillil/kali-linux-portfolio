import {
  HIGH_SCORE_KEY,
  advanceWave,
  createGame,
  createShields,
  createWave,
  getInvaderStepInterval,
  spawnUFO,
  stepGame,
  updateHighScore,
} from './space-invaders-engine';

export {
  HIGH_SCORE_KEY,
  advanceWave,
  createGame,
  createShields,
  createWave,
  getInvaderStepInterval,
  spawnUFO,
  stepGame,
  updateHighScore,
};

export type {
  BulletState,
  GameState,
  InputState,
  InvaderState,
  PowerUpState,
  PowerUpType,
  ShieldState,
  StepEvent,
  StepOptions,
  UFOState,
} from './space-invaders-engine';

export const loadHighScore = (
  storage: Pick<Storage, 'getItem'> | null | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined,
) => {
  if (!storage) return 0;
  const raw = storage.getItem(HIGH_SCORE_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

export const persistHighScore = (
  score: number,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined,
) => {
  if (!storage) return score;
  const current = loadHighScore(storage);
  const next = updateHighScore(score, current);
  storage.setItem(HIGH_SCORE_KEY, String(next));
  return next;
};
