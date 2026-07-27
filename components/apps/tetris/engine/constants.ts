import { EngineConfig, PieceType } from './types';

export const PIECE_ORDER: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  width: 10,
  visibleHeight: 20,
  hiddenRows: 4,
  nextCount: 5,
  lockDelayMs: 500,
  lockResetLimit: 15,
  softDropFactor: 20,
  allowRotate180: false,
  ghostPiece: true,
  gridlines: true,
  sound: false,
};

export const SCORE_TABLE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};
