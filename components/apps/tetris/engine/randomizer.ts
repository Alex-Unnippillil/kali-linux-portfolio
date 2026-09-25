import { PIECE_ORDER } from './constants';
import { PieceType } from './types';

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const makeBag = (seed: number): { bag: PieceType[]; nextSeed: number } => {
  const random = mulberry32(seed);
  const bag = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return { bag, nextSeed: (seed + 1) >>> 0 };
};

export const refillQueue = (
  queue: PieceType[],
  rngState: number,
  targetLength: number,
): { queue: PieceType[]; rngState: number } => {
  let nextQueue = [...queue];
  let seed = rngState;
  while (nextQueue.length < targetLength) {
    const { bag, nextSeed } = makeBag(seed);
    nextQueue = [...nextQueue, ...bag];
    seed = nextSeed;
  }
  return { queue: nextQueue, rngState: seed };
};
