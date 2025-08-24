export const TILE = 40;
export const NUM_TILES_WIDE = 13;

export const PAD_POSITIONS = [TILE, TILE * 3, TILE * 5, TILE * 7, TILE * 9];
export const NUM_TILES_WIDE = 13;


// linear congruential generator for deterministic lane RNG
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export interface LaneDef {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
  type?: 'car' | 'log';
}

export interface Lane extends LaneDef {
  items: { x: number; width: number; height: number }[];
  timer: number;
  rng: () => number;
}

export const initLane = (def: LaneDef, seed = Date.now()): Lane => {
  const rand = rng(seed);
  const type = def.type || 'car';
  return {
    ...def,
    type,
    speed: def.speed * (0.8 + rand() * 0.4),
    items: [],
    timer: rand() * def.spawnRate,
    rng: rand,
  };
};

export const updateCars = (
  lanes: Lane[],
  frog: { x: number; y: number },
  dt: number
) => {
  let frogDx = 0;
  const newLanes = lanes.map((lane) => {
    let timer = lane.timer - dt;
    const items = lane.items
      .map((c) => ({ ...c, x: c.x + lane.speed * lane.dir * dt }))
      .filter((c) => c.x + c.width > 0 && c.x < TILE * NUM_TILES_WIDE);

    if (timer <= 0) {
      const width = lane.length * TILE;
      const x = lane.dir === 1 ? -width : TILE * NUM_TILES_WIDE;
      items.push({ x, width, height: TILE });
      timer += lane.spawnRate + lane.rng() * lane.spawnRate;
    }

    if (lane.type === 'log' && frog.y === lane.y) {
      const onLog = items.find(
        (c) => frog.x < c.x + c.width && frog.x + TILE > c.x
      );
      if (onLog) frogDx = lane.speed * lane.dir * dt;
    }

    return { ...lane, items, timer };
  });

  const frogBox = { x: frog.x, y: frog.y, width: TILE, height: TILE };
  let dead = newLanes.some(
    (lane) =>
      lane.type === 'car' &&
      lane.y === frog.y &&
      lane.items.some(
        (c) =>
          frogBox.x + COLLISION_TOLERANCE < c.x + c.width &&
          frogBox.x + frogBox.width - COLLISION_TOLERANCE > c.x
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
    speed: lane.speed * (1 + 0.2 * inc),
    spawnRate: Math.max(minRate, lane.spawnRate * (1 - 0.1 * inc)),
  };
};

export const carLaneDefs: LaneDef[] = [
  { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1, type: 'car' },
];

export const logLaneDefs: LaneDef[] = [
  { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1, type: 'log' },
];
