import { GRID_WIDTH, HOME_ROW, PAD_POSITIONS, SUB_STEP, WATER_ROWS } from './types';
import type { DeathCause, FrogPosition, HomeBayState, LaneEntity, LaneState } from './types';

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

export const initLane = (
  lane: Omit<LaneState, 'entities' | 'rng' | 'timer'>,
  seed: number,
): LaneState => {
  const rng = makeRng(seed);
  return {
    ...lane,
    entities: [],
    rng,
    timer: lane.spawnRate * (0.45 + rng() * 0.7),
  };
};

const moveEntities = (entities: LaneEntity[], stepDist: number): LaneEntity[] => {
  for (let i = 0; i < entities.length; i += 1) {
    entities[i].x += stepDist;
    if (typeof entities[i].phase === 'number') {
      entities[i].phase = (entities[i].phase ?? 0) + Math.abs(stepDist) * 0.5;
    }
  }
  return entities;
};

const entityHitsFrog = (entity: LaneEntity, lane: LaneState, frog: FrogPosition) =>
  frog.x < entity.x + lane.length && frog.x + 1 > entity.x;

const isGatorMouthUnsafe = (entity: LaneEntity, lane: LaneState, frog: FrogPosition) => {
  if (lane.kind !== 'gator') return false;
  const mouthStart = lane.dir === 1 ? entity.x + lane.length - 0.75 : entity.x;
  const mouthEnd = mouthStart + 0.75;
  return frog.x + 0.8 > mouthStart && frog.x < mouthEnd;
};

const isTurtleSubmerged = (entity: LaneEntity) => {
  const phase = entity.phase ?? 0;
  const normalized = (Math.sin(phase) + 1) / 2;
  return normalized < 0.18;
};

export const updateCars = (prev: LaneState[], frogPos: FrogPosition, dt: number) => {
  let dead = false;
  let deathCause: DeathCause | null = null;
  const lanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    const entities = lane.entities.map((e) => ({ ...e }));
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;

    for (let i = 0; i < steps; i += 1) {
      moveEntities(entities, stepDist);
      if (!dead && lane.y === frogPos.y && entities.some((e) => entityHitsFrog(e, lane, frogPos))) {
        dead = true;
        deathCause = 'vehicle';
      }
    }

    const kept = entities.filter((e) => e.x + lane.length > -1 && e.x < GRID_WIDTH + 1);
    if (timer <= 0) {
      kept.push({ x: lane.dir === 1 ? -lane.length : GRID_WIDTH + 0.1 });
      timer += lane.spawnRate * (0.55 + lane.rng() * 0.7);
    }
    return { ...lane, entities: kept, timer };
  });

  return { lanes, dead, deathCause };
};

export const updateLogs = (prev: LaneState[], frogPos: FrogPosition, dt: number) => {
  const frog = { ...frogPos };
  let safe = !WATER_ROWS.includes(frog.y as (typeof WATER_ROWS)[number]);
  let dead = false;
  let deathCause: DeathCause | null = null;

  const lanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    const entities = lane.entities.map((e) => ({ ...e }));
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;

    for (let i = 0; i < steps; i += 1) {
      moveEntities(entities, stepDist);
      if (frog.y === lane.y) {
        const support = entities.find((e) => frog.x >= e.x && frog.x < e.x + lane.length);
        if (support) {
          if (lane.kind === 'turtle' && isTurtleSubmerged(support)) {
            dead = true;
            deathCause = 'turtle_dive';
          } else if (isGatorMouthUnsafe(support, lane, frog)) {
            dead = true;
            deathCause = 'gator_mouth';
          } else {
            frog.x += stepDist;
            safe = true;
          }
        }
      }
    }

    const kept = entities.filter((e) => e.x + lane.length > -1.5 && e.x < GRID_WIDTH + 1.5);
    if (timer <= 0) {
      const hasLady = lane.kind === 'log' && lane.rng() > 0.9;
      kept.push({
        x: lane.dir === 1 ? -lane.length : GRID_WIDTH + 0.1,
        hasLady,
        phase: lane.kind === 'turtle' ? lane.rng() * Math.PI * 2 : 0,
      });
      timer += lane.spawnRate * (0.55 + lane.rng() * 0.75);
    }
    return { ...lane, entities: kept, timer };
  });

  frog.x = Number(frog.x.toFixed(4));
  if (!dead && WATER_ROWS.includes(frog.y as (typeof WATER_ROWS)[number]) && !safe) {
    dead = true;
    deathCause = 'drown';
  }
  if (!dead && (frog.x < 0 || frog.x >= GRID_WIDTH)) {
    dead = true;
    deathCause = 'offscreen';
  }

  return { lanes, frog, dead, deathCause };
};

export const createHomes = (): HomeBayState[] =>
  PAD_POSITIONS.map(() => ({ filled: false, fly: false, gatorHead: false }));

export const handlePads = (frogPos: FrogPosition, pads: boolean[]) => {
  if (frogPos.y !== HOME_ROW) {
    return { pads, dead: false, levelComplete: false, padHit: false };
  }
  const idx = PAD_POSITIONS.indexOf(Math.floor(frogPos.x) as (typeof PAD_POSITIONS)[number]);
  if (idx === -1 || pads[idx]) {
    return { pads, dead: true, levelComplete: false, padHit: false };
  }
  const next = [...pads];
  next[idx] = true;
  return {
    pads: next,
    dead: false,
    levelComplete: next.every(Boolean),
    padHit: true,
  };
};

export const resolveHomeEntry = (
  frogPos: FrogPosition,
  homes: HomeBayState[],
  carryingLady = false,
) => {
  if (frogPos.y !== HOME_ROW) {
    return { homes, dead: false, score: 0, levelComplete: false };
  }
  const idx = PAD_POSITIONS.indexOf(Math.floor(frogPos.x) as (typeof PAD_POSITIONS)[number]);
  if (idx < 0) {
    return { homes, dead: true, cause: 'invalid_home' as DeathCause, score: 0, levelComplete: false };
  }
  const bay = homes[idx];
  if (bay.filled) {
    return { homes, dead: true, cause: 'occupied_home' as DeathCause, score: 0, levelComplete: false };
  }
  if (bay.gatorHead) {
    return { homes, dead: true, cause: 'gator_home' as DeathCause, score: 0, levelComplete: false };
  }

  const next = homes.map((h, i) => (i === idx ? { filled: true, fly: false, gatorHead: false } : h));
  const baseScore = 50 + (bay.fly ? 200 : 0) + (carryingLady ? 200 : 0);
  return {
    homes: next,
    dead: false,
    score: baseScore,
    levelComplete: next.every((h) => h.filled),
  };
};

export const tickHomeHazards = (homes: HomeBayState[], dt: number, rng: () => number) => {
  if (dt <= 0) return homes;
  return homes.map((home) => {
    if (home.filled) return { ...home, fly: false, gatorHead: false };
    let fly = home.fly;
    let gatorHead = home.gatorHead;
    if (!fly && !gatorHead && rng() < dt * 0.05) {
      fly = true;
    } else if (!fly && !gatorHead && rng() < dt * 0.045) {
      gatorHead = true;
    } else if ((fly || gatorHead) && rng() < dt * 0.22) {
      fly = false;
      gatorHead = false;
    }
    return { ...home, fly, gatorHead };
  });
};

export const tickTimer = (timeLeft: number, dt: number) => {
  const next = Math.max(0, timeLeft - dt);
  return { timeLeft: next, timedOut: next <= 0 };
};

export const applyForwardProgressScore = (bestY: number, nextY: number) => {
  if (nextY < bestY) {
    return { bestY: nextY, scoreDelta: 10 };
  }
  return { bestY, scoreDelta: 0 };
};
