import type { LaneDef } from './config';

export const WIDTH = 7;
export const HEIGHT = 8;
export const PAD_POSITIONS = [1, 3, 5];
const SUB_STEP = 0.5;

export interface Position {
  x: number;
  y: number;
}

export interface EntityRuntime {
  x: number;
}

export interface LaneRuntime extends LaneDef {
  entities: EntityRuntime[];
  rng: () => number;
  timer: number;
}

export type DeathCause = 'car' | 'water' | 'goalInvalid' | 'timeout' | 'outOfBounds';

export type StepEvent =
  | { type: 'none' }
  | { type: 'death'; cause: DeathCause; pos: Position }
  | { type: 'padHit'; padIndex: number }
  | { type: 'levelComplete' };

export interface StepResult {
  frog: Position;
  cars: LaneRuntime[];
  logs: LaneRuntime[];
  pads: boolean[];
  event: StepEvent;
}

export const makeRng = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const initLane = (lane: LaneDef, seed: number): LaneRuntime => {
  const rng = makeRng(seed);
  return {
    ...lane,
    entities: [],
    rng,
    timer: lane.spawnRate * (0.5 + rng()),
  };
};

const overlapsCar = (frog: Position, lane: LaneRuntime, entity: EntityRuntime) =>
  frog.y === lane.y && frog.x < entity.x + lane.length && frog.x + 1 > entity.x;

const overlapsLog = (frog: Position, lane: LaneRuntime, entity: EntityRuntime) =>
  frog.y === lane.y && entity.x <= frog.x && frog.x < entity.x + lane.length;

interface StepArgs {
  frog: Position;
  cars: LaneRuntime[];
  logs: LaneRuntime[];
  pads: boolean[];
  dt: number;
  width?: number;
  height?: number;
  padPositions?: number[];
  goalRow?: number;
  timeExpired?: boolean;
}

export const getRowSets = (cars: LaneRuntime[], logs: LaneRuntime[]) => {
  const carRows = new Set<number>(cars.map((l) => l.y));
  const logRows = new Set<number>(logs.map((l) => l.y));
  return { carRows, logRows };
};

const stepCarLanes = (
  lanes: LaneRuntime[],
  frog: Position,
  dt: number,
  width: number,
): { lanes: LaneRuntime[]; hit: boolean } => {
  let hit = false;
  const newLanes = lanes.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      if (!hit && entities.some((e) => overlapsCar(frog, lane, e))) hit = true;
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (!hit && entities.some((e) => overlapsCar(frog, lane, e))) hit = true;
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < width);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : width });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  return { lanes: newLanes, hit };
};

const stepLogLanes = (
  lanes: LaneRuntime[],
  frog: Position,
  dt: number,
  width: number,
): { lanes: LaneRuntime[]; frog: Position; riding: boolean } => {
  let riding = false;
  let newFrog = { ...frog };
  const newLanes = lanes.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      const onLogBefore = entities.some((e) => overlapsLog(newFrog, lane, e));
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      const onLogAfter = entities.some((e) => overlapsLog(newFrog, lane, e));
      if (onLogBefore || onLogAfter) {
        newFrog = { ...newFrog, x: newFrog.x + stepDist };
        riding = true;
      }
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < width);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : width });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  newFrog.x = Math.round(newFrog.x);
  return { lanes: newLanes, frog: newFrog, riding };
};

export const stepWorld = ({
  frog,
  cars,
  logs,
  pads,
  dt,
  width = WIDTH,
  height = HEIGHT,
  padPositions = PAD_POSITIONS,
  goalRow = 0,
  timeExpired,
}: StepArgs): StepResult => {
  if (timeExpired) {
    return {
      frog,
      cars,
      logs,
      pads,
      event: { type: 'death', cause: 'timeout', pos: { ...frog } },
    };
  }

  const carStep = stepCarLanes(cars, frog, dt, width);
  const logStep = stepLogLanes(logs, frog, dt, width);
  const rowSets = getRowSets(carStep.lanes, logStep.lanes);

  const frogAfter = logStep.frog;
  const outOfBounds =
    frogAfter.x < 0 || frogAfter.x >= width || frogAfter.y < 0 || frogAfter.y >= height;
  if (carStep.hit) {
    return {
      frog: frogAfter,
      cars: carStep.lanes,
      logs: logStep.lanes,
      pads,
      event: { type: 'death', cause: 'car', pos: { ...frog } },
    };
  }

  if (outOfBounds) {
    return {
      frog: frogAfter,
      cars: carStep.lanes,
      logs: logStep.lanes,
      pads,
      event: { type: 'death', cause: 'outOfBounds', pos: { ...frogAfter } },
    };
  }

  if (rowSets.logRows.has(frogAfter.y) && !logStep.riding) {
    return {
      frog: frogAfter,
      cars: carStep.lanes,
      logs: logStep.lanes,
      pads,
      event: { type: 'death', cause: 'water', pos: { ...frogAfter } },
    };
  }

  if (frogAfter.y === goalRow) {
    const padIndex = padPositions.indexOf(Math.floor(frogAfter.x));
    if (padIndex === -1 || pads[padIndex]) {
      return {
        frog: frogAfter,
        cars: carStep.lanes,
        logs: logStep.lanes,
        pads,
        event: { type: 'death', cause: 'goalInvalid', pos: { ...frogAfter } },
      };
    }
    const nextPads = [...pads];
    nextPads[padIndex] = true;
    const levelComplete = nextPads.every(Boolean);
    return {
      frog: frogAfter,
      cars: carStep.lanes,
      logs: logStep.lanes,
      pads: nextPads,
      event: levelComplete ? { type: 'levelComplete' } : { type: 'padHit', padIndex },
    };
  }

  return {
    frog: frogAfter,
    cars: carStep.lanes,
    logs: logStep.lanes,
    pads,
    event: { type: 'none' },
  };
};

