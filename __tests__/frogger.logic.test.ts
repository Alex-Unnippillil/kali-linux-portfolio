import { PAD_POSITIONS } from '../apps/games/frogger/logic';
import type { LaneRuntime } from '../apps/games/frogger/logic';
import { HEIGHT, stepWorld } from '../apps/games/frogger/logic';

type PartialLane = Partial<LaneRuntime> & { y: number; dir?: 1 | -1; speed?: number; spawnRate?: number; length?: number };

const createLane = (lane: PartialLane): LaneRuntime => ({
  y: lane.y,
  dir: lane.dir ?? 1,
  speed: lane.speed ?? 1,
  spawnRate: lane.spawnRate ?? 10,
  length: lane.length ?? 1,
  entities: lane.entities ?? [],
  timer: lane.timer ?? 10,
  rng: () => 0,
});

const emptyPads = PAD_POSITIONS.map(() => false);

describe('frogger logic', () => {
  it('keeps frog safe on rows without cars or logs', () => {
    const result = stepWorld({
      frog: { x: 3, y: 3 },
      cars: [createLane({ y: 5, entities: [{ x: 2 }] })],
      logs: [createLane({ y: 1, dir: -1, speed: 0.5, length: 2 })],
      pads: emptyPads,
      dt: 0.5,
      height: HEIGHT,
    });

    expect(result.event.type).toBe('none');
  });

  it('carries the frog along with a log when overlapping', () => {
    const result = stepWorld({
      frog: { x: 2, y: 1 },
      cars: [],
      logs: [createLane({ y: 1, dir: 1, speed: 1, length: 2, entities: [{ x: 2 }] })],
      pads: emptyPads,
      dt: 1,
      height: HEIGHT,
    });

    expect(result.frog.x).toBe(3);
    expect(result.event.type).toBe('none');
  });

  it('completes a level only after all pads are filled', () => {
    const first = stepWorld({
      frog: { x: 1, y: 0 },
      cars: [],
      logs: [],
      pads: emptyPads,
      dt: 0.1,
    });
    expect(first.event).toEqual({ type: 'padHit', padIndex: 0 });

    const second = stepWorld({
      frog: { x: 3, y: 0 },
      cars: [],
      logs: [],
      pads: first.pads,
      dt: 0.1,
    });
    expect(second.event).toEqual({ type: 'padHit', padIndex: 1 });

    const third = stepWorld({
      frog: { x: 5, y: 0 },
      cars: [],
      logs: [],
      pads: second.pads,
      dt: 0.1,
    });
    expect(third.event.type).toBe('levelComplete');
  });

  it('kills the frog when a car overlaps at the start of the tick', () => {
    const result = stepWorld({
      frog: { x: 1, y: 2 },
      cars: [createLane({ y: 2, entities: [{ x: 1 }] })],
      logs: [],
      pads: emptyPads,
      dt: 0.01,
    });

    expect(result.event).toEqual({ type: 'death', cause: 'car', pos: { x: 1, y: 2 } });
  });
});
