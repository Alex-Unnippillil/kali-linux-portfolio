import type { LaneConfiguration } from './config';

export const LEVELS: LaneConfiguration[] = [
  {
    cars: [
      { y: 7, dir: 1, speed: 2.2, spawnRate: 1.4, length: 2, kind: 'car' },
      { y: 8, dir: -1, speed: 2.7, spawnRate: 1.2, length: 2, kind: 'car' },
      { y: 9, dir: 1, speed: 3.2, spawnRate: 1.2, length: 2, kind: 'car' },
      { y: 10, dir: -1, speed: 2.8, spawnRate: 1.1, length: 3, kind: 'car' },
      { y: 11, dir: 1, speed: 3.5, spawnRate: 1.05, length: 2, kind: 'car' },
    ],
    logs: [
      { y: 1, dir: -1, speed: 1.5, spawnRate: 1.7, length: 3, kind: 'log' },
      { y: 2, dir: 1, speed: 1.7, spawnRate: 1.8, length: 2, kind: 'turtle' },
      { y: 3, dir: -1, speed: 1.8, spawnRate: 1.5, length: 3, kind: 'log' },
      { y: 4, dir: 1, speed: 1.9, spawnRate: 1.8, length: 2, kind: 'turtle' },
      { y: 5, dir: -1, speed: 2.1, spawnRate: 1.55, length: 3, kind: 'gator' },
    ],
  },
];

export const getLevelConfig = (level: number): LaneConfiguration =>
  LEVELS[(level - 1) % LEVELS.length];
