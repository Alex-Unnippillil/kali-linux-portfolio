export const TILE = 40;
export const NUM_TILES_WIDE = 13;
export const PAD_POSITIONS = [TILE, TILE * 3, TILE * 5, TILE * 7, TILE * 9];
export const COLLISION_TOLERANCE = 4;


// linear congruential generator for deterministic lane RNG
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export type MovementPattern = 'straight' | 'wave';
export const EASINGS = {
  linear: (t: number) => t,
  easeInOutSine: (t: number) => 0.5 - Math.cos(Math.PI * t) / 2,
};
export type EasingName = keyof typeof EASINGS;

export interface LaneDef {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
  type?: 'car' | 'log';
  pattern?: MovementPattern;
  easing?: EasingName;
  difficulty?: number;
}

export interface Lane extends LaneDef {
  items: { x: number; width: number; height: number }[];
  timer: number;
  rng: () => number;
  time: number;
}

export const initLane = (def: LaneDef, seed = Date.now()): Lane => {
  const rand = rng(seed);
  const type = def.type || 'car';
  const pattern = def.pattern || 'straight';
  const easing: EasingName = def.easing || 'linear';
  const difficulty = def.difficulty || 1;
  return {
    ...def,
    type,
    pattern,
    easing,
    difficulty,
    speed: def.speed * difficulty * (0.8 + rand() * 0.4),
    items: [],
    timer: rand() * def.spawnRate,
    rng: rand,
    time: 0,
  };
};

export const rectsIntersect = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

export const updateCars = (
  lanes: Lane[],
  frog: { x: number; y: number },
  dt: number
) => {
  let frogDx = 0;
  const newLanes = lanes.map((lane) => {
    let timer = lane.timer - dt;
    const easingFn = EASINGS[lane.easing || 'linear'];
    const move = lane.speed * lane.dir * easingFn(Math.min(dt, 1));
    const time = lane.time + dt;
    const items = lane.items
      .map((c) => ({
        ...c,
        x:
          c.x +
          move +
          (lane.pattern === 'wave'
            ? Math.sin(time + c.x / TILE) * lane.speed * 0.1
            : 0),
      }))
      .filter((c) => c.x + c.width > 0 && c.x < TILE * NUM_TILES_WIDE);

    if (timer <= 0) {
      const width = lane.length * TILE;
      const x = lane.dir === 1 ? -width : TILE * NUM_TILES_WIDE;
      items.push({ x, width, height: TILE });
      timer += lane.spawnRate + lane.rng() * lane.spawnRate;
    }

    if (lane.type === 'log' && frog.y === lane.y) {
      const onLog = items.find((c) =>
        rectsIntersect({ x: frog.x, y: frog.y, width: TILE, height: TILE }, {
          x: c.x,
          y: lane.y,
          width: c.width,
          height: TILE,
        })
      );
      if (onLog) frogDx = lane.speed * lane.dir * dt;
    }

    return { ...lane, items, timer, time };
  });

  const frogBox = {
    x: frog.x + COLLISION_TOLERANCE,
    y: frog.y,
    width: TILE - COLLISION_TOLERANCE * 2,
    height: TILE,
  };
  let dead = newLanes.some(
    (lane) =>
      lane.type === 'car' &&
      lane.y === frog.y &&
      lane.items.some((c) =>
        rectsIntersect(frogBox, {
          x: c.x,
          y: lane.y,
          width: c.width,
          height: TILE,
        })
      )
  );

  if (!dead) {
    const logLane = newLanes.find(
      (l) => l.type === 'log' && l.y === frog.y
    );
    if (logLane && frogDx === 0) dead = true;
  }

  return { lanes: newLanes, dead, frogDx };
};

export const handlePads = (
  frog: { x: number; y: number },
  pads: boolean[]
): { pads: boolean[]; padHit: boolean; dead: boolean } => {
  const index = PAD_POSITIONS.indexOf(frog.x);
  if (frog.y !== 0 || index === -1)
    return { pads, padHit: false, dead: true };
  if (pads[index]) return { pads, padHit: false, dead: true };
  const next = [...pads];
  next[index] = true;
  return { pads: next, padHit: true, dead: false };
};

export const rampLane = (lane: LaneDef, level: number, minRate: number) => {
  const inc = level - 1;
  return {
    ...lane,
    speed: lane.speed * (1 + 0.2 * inc) * (lane.difficulty || 1),
    spawnRate: Math.max(minRate, lane.spawnRate * (1 - 0.1 * inc)),
  };
};

export const carLaneDefs: LaneDef[] = [
  {
    y: 0,
    dir: 1,
    speed: 1,
    spawnRate: 1,
    length: 1,
    type: 'car',
    pattern: 'straight',
    easing: 'linear',
    difficulty: 1,
  },
];

export const logLaneDefs: LaneDef[] = [
  {
    y: 0,
    dir: 1,
    speed: 1,
    spawnRate: 1,
    length: 1,
    type: 'log',
    pattern: 'wave',
    easing: 'easeInOutSine',
    difficulty: 1,
  },
];
