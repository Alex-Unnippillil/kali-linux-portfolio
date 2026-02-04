export const GRID_WIDTH = 7;
export const GRID_HEIGHT = 8;
export const CELL_SIZE = 32;
export const SUB_STEP = 0.5;
export const RIPPLE_DURATION = 0.5;
export const FROG_HOP_DURATION = 0.18;

export const PAD_POSITIONS = [1, 3, 5];

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface FrogPosition {
  x: number;
  y: number;
}

export interface LaneEntity {
  x: number;
}

export interface LaneState {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
  entities: LaneEntity[];
  rng: () => number;
  timer: number;
}

export interface FroggerAnimationState {
  start: FrogPosition;
  end: FrogPosition;
  progress: number;
}

export interface FroggerSplash {
  x: number;
  y: number;
  t: number;
}
