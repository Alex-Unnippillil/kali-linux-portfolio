import { SUB_STEP, GRID_WIDTH, PAD_POSITIONS } from './types';
import type { FrogPosition, LaneState } from './types';

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

export const clampDelta = (dt: number, max = 0.25) =>
  Math.max(0, Math.min(dt, max));

export const initLane = (lane: Omit<LaneState, 'entities' | 'rng' | 'timer'>, seed: number): LaneState => {
  const rng = makeRng(seed);
  return {
    ...lane,
    entities: [],
    rng,
    timer: lane.spawnRate * (0.5 + rng()),
  };
};

export const updateCars = (prev: LaneState[], frogPos: FrogPosition, dt: number) => {
  let dead = false;
  const newLanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (
        lane.y === frogPos.y &&
        entities.some((e) => frogPos.x < e.x + lane.length && frogPos.x + 1 > e.x)
      )
        dead = true;
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < GRID_WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : GRID_WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  return { lanes: newLanes, dead };
};

export const updateLogs = (prev: LaneState[], frogPos: FrogPosition, dt: number) => {
  let newFrog = { ...frogPos };
  let safe = false;
  const newLanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (
        newFrog.y === lane.y &&
        entities.some((e) => e.x <= newFrog.x && newFrog.x < e.x + lane.length)
      ) {
        newFrog.x += stepDist;
        safe = true;
      }
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < GRID_WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : GRID_WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  newFrog.x = Math.round(newFrog.x);
  const dead = (newFrog.y === 1 || newFrog.y === 2) && !safe;
  return { lanes: newLanes, frog: newFrog, dead };
};

export const handlePads = (frogPos: FrogPosition, pads: boolean[]) => {
  if (frogPos.y !== 0)
    return { pads, dead: false, levelComplete: false, padHit: false };
  const idx = PAD_POSITIONS.indexOf(Math.floor(frogPos.x));
  if (idx === -1 || pads[idx]) {
    return { pads, dead: true, levelComplete: false, padHit: false };
  }
  const newPads = [...pads];
  newPads[idx] = true;
  const levelComplete = newPads.every(Boolean);
  return { pads: newPads, dead: false, levelComplete, padHit: true };
};
