export const GRID_WIDTH = 13;
export const GRID_HEIGHT = 13;
export const CELL_SIZE = 28;
export const SUB_STEP = 0.35;
export const RIPPLE_DURATION = 0.5;
export const FROG_HOP_DURATION = 0.16;

export const HOME_ROW = 0;
export const WATER_ROWS = [1, 2, 3, 4, 5] as const;
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10, 11] as const;
export const START_ROW = GRID_HEIGHT - 1;
export const PAD_POSITIONS = [1, 4, 6, 8, 11] as const;

export type Difficulty = 'easy' | 'normal' | 'hard';

export type LaneKind = 'car' | 'log' | 'turtle' | 'gator';

export interface FrogPosition {
  x: number;
  y: number;
}

export interface LaneEntity {
  x: number;
  hasLady?: boolean;
  phase?: number;
}

export interface LaneState {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
  kind: LaneKind;
  entities: LaneEntity[];
  rng: () => number;
  timer: number;
}

export interface HomeBayState {
  filled: boolean;
  fly: boolean;
  gatorHead: boolean;
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

export type DeathCause =
  | 'vehicle'
  | 'drown'
  | 'timeout'
  | 'offscreen'
  | 'occupied_home'
  | 'invalid_home'
  | 'gator_home'
  | 'gator_mouth'
  | 'turtle_dive';
