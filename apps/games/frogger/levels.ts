import type { LaneConfiguration } from './config';

/**
 * Predefined level layouts for Frogger.
 * Each level specifies the arrangement of car and log lanes.
 * Higher levels introduce additional lanes and faster defaults.
 */
export const LEVELS: LaneConfiguration[] = [
  {
    cars: [
      { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
      { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
    ],
    logs: [
      { y: 1, dir: -1, speed: 0.5, spawnRate: 2.5, length: 2 },
      { y: 2, dir: 1, speed: 0.7, spawnRate: 2.2, length: 2 },
    ],
  },
  {
    cars: [
      { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
      { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
      { y: 6, dir: 1, speed: 1.3, spawnRate: 1.6, length: 1 },
    ],
    logs: [
      { y: 1, dir: -1, speed: 0.6, spawnRate: 2.2, length: 2 },
      { y: 2, dir: 1, speed: 0.8, spawnRate: 2, length: 2 },
    ],
  },
  {
    cars: [
      { y: 3, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
      { y: 4, dir: 1, speed: 1.3, spawnRate: 1.7, length: 1 },
      { y: 5, dir: -1, speed: 1.5, spawnRate: 1.6, length: 1 },
      { y: 6, dir: 1, speed: 1.6, spawnRate: 1.5, length: 1 },
    ],
    logs: [
      { y: 1, dir: -1, speed: 0.7, spawnRate: 1.9, length: 3 },
      { y: 2, dir: 1, speed: 0.9, spawnRate: 1.8, length: 2 },
    ],
  },
  {
    cars: [
      { y: 3, dir: 1, speed: 1.4, spawnRate: 1.6, length: 1 },
      { y: 4, dir: -1, speed: 1.6, spawnRate: 1.5, length: 1 },
      { y: 5, dir: 1, speed: 1.8, spawnRate: 1.4, length: 1 },
      { y: 6, dir: -1, speed: 1.9, spawnRate: 1.3, length: 2 },
    ],
    logs: [
      { y: 1, dir: -1, speed: 0.8, spawnRate: 1.7, length: 3 },
      { y: 2, dir: 1, speed: 1.0, spawnRate: 1.6, length: 2 },
    ],
  },
  {
    cars: [
      { y: 3, dir: 1, speed: 1.6, spawnRate: 1.4, length: 1 },
      { y: 4, dir: -1, speed: 1.8, spawnRate: 1.3, length: 1 },
      { y: 5, dir: 1, speed: 2, spawnRate: 1.2, length: 2 },
      { y: 6, dir: -1, speed: 2.2, spawnRate: 1.1, length: 2 },
    ],
    logs: [
      { y: 1, dir: -1, speed: 0.9, spawnRate: 1.5, length: 3 },
      { y: 2, dir: 1, speed: 1.1, spawnRate: 1.4, length: 3 },
    ],
  },
];

export const getLevelConfig = (level: number): LaneConfiguration =>
  LEVELS[(level - 1) % LEVELS.length]!;


