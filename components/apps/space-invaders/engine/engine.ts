import { createRng } from './rng';
import { createInitialState } from './state';
import {
  applyProgression,
  maybeShoot,
  resolveCollisions,
  updateInvaders,
  updatePlayer,
  updateUfo,
} from './systems';
import { EngineConfig, EngineStepResult, GameState, InputSnapshot } from './types';

const FIXED_STEP_MS = 1000 / 60;

export interface SpaceInvadersEngine {
  reset(): void;
  step(dtMs: number, input: InputSnapshot): EngineStepResult;
  getState(): GameState;
  setSeed(seed: number): void;
  setHighScore(score: number): void;
  setMultiShot(enabled: boolean): void;
  start(): void;
  setPaused(paused: boolean): void;
}


export const createEngine = (config: EngineConfig): SpaceInvadersEngine => {
  const rng = createRng(config.seed ?? 1337);
  let allowMultiShot = Boolean(config.allowMultiShot);
  let state = createInitialState(config.width, config.height);

  const reset = () => {
    state = createInitialState(config.width, config.height, state.highScore);
  };

  const step = (dtMs: number, input: InputSnapshot): EngineStepResult => {
    const events: EngineStepResult['events'] = [];

    if (state.phase !== 'playing') {
      return { events };
    }

    state.timeMs += dtMs;
    state.player.respawnGraceMs = Math.max(0, state.player.respawnGraceMs - dtMs);

    updatePlayer(state, input, dtMs, allowMultiShot);
    updateInvaders(state, dtMs);
    maybeShoot(state, dtMs, rng);
    updateUfo(state, dtMs, rng);
    resolveCollisions(state, dtMs, events);
    applyProgression(state, events);
    state.highScore = Math.max(state.highScore, state.score);

    return { events };
  };

  return {
    reset,
    step,
    getState: () => ({ ...state, player: { ...state.player } }),
    setSeed: (seed) => rng.setSeed(seed),
    setHighScore: (score) => {
      state.highScore = score;
    },
    setMultiShot: (enabled) => {
      allowMultiShot = enabled;
    },
    start: () => {
      state.phase = "playing";
      state.gameOverReason = null;
    },
    setPaused: (paused) => {
      if (state.phase === "gameover" || state.phase === "start") return;
      state.phase = paused ? "paused" : "playing";
    },
  };
};

export const FIXED_TIMESTEP_MS = FIXED_STEP_MS;
