import { mulberry32, seededInt } from './rng';

export type InputFrame = {
  left?: boolean;
  right?: boolean;
  throttle?: boolean;
  brake?: boolean;
  boost?: boolean;
};

export type Rect = { left: number; right: number; top: number; bottom: number };

export type LevelConfig = {
  id: string;
  trackWidth: number;
  trackHeight: number;
  lanes: number;
  carSize: { width: number; height: number };
  obstacleSize: { width: number; height: number };
  carStart: { x: number; y: number };
  maxSpeed: number;
  maxLateralSpeed: number;
  maxAccelX: number;
  throttleAccel: number;
  brakeAccel: number;
  drag: number;
  spawnBase: number;
  spawnVariance: number;
  reactionDistance: number;
  lapDistance: number;
  maxPenetration: number;
  tickRate: number;
};

export type Obstacle = {
  id: number;
  lane: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

export type GameState = {
  seed: number;
  levelId: string;
  config: LevelConfig;
  tick: number;
  timeSec: number;
  distance: number;
  car: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    heading: number;
  };
  forwardSpeed: number;
  obstacles: Obstacle[];
  rng: () => number;
  nextSpawnAt: number;
  lastSpawnLane: number | null;
  laps: number;
  lapTimes: number[];
  lapStartTime: number;
  lapEndDistance: number;
  crashed: boolean;
};

const LEVELS: Record<string, LevelConfig> = {
  default: {
    id: 'default',
    trackWidth: 300,
    trackHeight: 400,
    lanes: 3,
    carSize: { width: 60, height: 50 },
    obstacleSize: { width: 60, height: 40 },
    carStart: { x: 120, y: 340 },
    maxSpeed: 260,
    maxLateralSpeed: 240,
    maxAccelX: 720,
    throttleAccel: 260,
    brakeAccel: 360,
    drag: 70,
    spawnBase: 210,
    spawnVariance: 120,
    reactionDistance: 160,
    lapDistance: 1200,
    maxPenetration: 120,
    tickRate: 120,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getLevelConfig(levelId: string): LevelConfig {
  return LEVELS[levelId] ?? LEVELS.default;
}

export function getCarAABB(state: GameState): Rect {
  const { position } = state.car;
  const { width, height } = state.config.carSize;
  return {
    left: position.x,
    right: position.x + width,
    top: position.y,
    bottom: position.y + height,
  };
}

export function getObstacleAABB(obstacle: Obstacle): Rect {
  return {
    left: obstacle.position.x,
    right: obstacle.position.x + obstacle.size.width,
    top: obstacle.position.y,
    bottom: obstacle.position.y + obstacle.size.height,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function chooseLane(config: LevelConfig, rng: () => number, obstacles: Obstacle[], last: number | null) {
  const lanes = Array.from({ length: config.lanes }, (_, i) => i);
  const viable = lanes.filter((lane) => {
    const blocked = obstacles.some(
      (o) =>
        o.lane === lane &&
        o.position.y > -config.obstacleSize.height &&
        o.position.y < config.reactionDistance,
    );
    return !blocked || config.lanes === 1;
  });
  const pool = viable.length > 0 ? viable : lanes;
  const lane = pool[seededInt(rng, pool.length)];
  if (pool.length > 1 && last !== null && lane === last) {
    return pool[(pool.indexOf(lane) + 1) % pool.length];
  }
  return lane;
}

function spawnObstacle(state: GameState): Obstacle {
  const { config, rng } = state;
  const laneWidth = config.trackWidth / config.lanes;
  const lane = chooseLane(config, rng, state.obstacles, state.lastSpawnLane);
  const x = lane * laneWidth + (laneWidth - config.obstacleSize.width) / 2;
  return {
    id: state.tick,
    lane,
    position: { x, y: -config.obstacleSize.height },
    size: { ...config.obstacleSize },
  };
}

export function createGame(seed: number, levelId: string): GameState {
  const config = getLevelConfig(levelId);
  const rng = mulberry32(seed);
  return {
    seed,
    levelId,
    config,
    tick: 0,
    timeSec: 0,
    distance: 0,
    car: {
      position: { ...config.carStart },
      velocity: { x: 0, y: 0 },
      heading: 0,
    },
    forwardSpeed: config.maxSpeed * 0.25,
    obstacles: [],
    rng,
    nextSpawnAt: config.spawnBase,
    lastSpawnLane: null,
    laps: 0,
    lapTimes: [],
    lapStartTime: 0,
    lapEndDistance: config.lapDistance,
    crashed: false,
  };
}

function resolveCollision(state: GameState, obstacle: Obstacle) {
  const carBox = getCarAABB(state);
  const obsBox = getObstacleAABB(obstacle);
  if (!overlaps(carBox, obsBox)) return;

  const penLeft = carBox.right - obsBox.left;
  const penRight = obsBox.right - carBox.left;
  const penTop = carBox.bottom - obsBox.top;
  const penBottom = obsBox.bottom - carBox.top;

  const penX = Math.min(penLeft, penRight);
  const penY = Math.min(penTop, penBottom);
  const maxPenetration = Math.max(penX, penY);

  if (maxPenetration > state.config.maxPenetration) {
    state.crashed = true;
    return;
  }

  if (penX < penY) {
    const dir = penLeft < penRight ? -1 : 1;
    const targetX = clamp(
      state.car.position.x + dir * penX,
      0,
      state.config.trackWidth - state.config.carSize.width,
    );
    state.car.position.x = targetX;
    state.car.velocity.x = 0;
  } else {
    const carCenter = (carBox.top + carBox.bottom) / 2;
    const obsCenter = (obsBox.top + obsBox.bottom) / 2;
    const dir = carCenter < obsCenter ? -1 : 1;
    const proposed = state.car.position.y + dir * penY;
    const targetY = clamp(proposed, 0, state.config.trackHeight - state.config.carSize.height);
    const applied = targetY - state.car.position.y;
    state.car.position.y = targetY;
    state.forwardSpeed = Math.max(0, state.forwardSpeed * (dir < 0 ? 0.5 : 0));
    const remaining = penY - Math.abs(applied);
    if (remaining > 0) {
      obstacle.position.y -= remaining * dir;
    }
  }
}

export function stepGame(prev: GameState, input: InputFrame, dtSec: number): GameState {
  const state: GameState = {
    ...prev,
    car: {
      ...prev.car,
      position: { ...prev.car.position },
      velocity: { ...prev.car.velocity },
    },
    obstacles: prev.obstacles.map((o) => ({ ...o, position: { ...o.position } })),
  };

  state.tick += 1;
  state.timeSec += dtSec;
  if (state.crashed) return state;

  const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let ax = steer * state.config.maxAccelX;
  ax = clamp(ax, -state.config.maxAccelX, state.config.maxAccelX);

  const throttle = input.throttle ? 1 : 0;
  const brake = input.brake ? 1 : 0;
  const boost = input.boost ? 1 : 0;

  let forwardAccel = throttle * state.config.throttleAccel - state.config.drag;
  forwardAccel -= brake * state.config.brakeAccel;
  if (boost) forwardAccel += state.config.throttleAccel;

  state.car.velocity.x = clamp(
    state.car.velocity.x + ax * dtSec,
    -state.config.maxLateralSpeed,
    state.config.maxLateralSpeed,
  );
  state.forwardSpeed = clamp(
    state.forwardSpeed + forwardAccel * dtSec,
    0,
    state.config.maxSpeed * (boost ? 1.2 : 1),
  );

  state.car.position.x += state.car.velocity.x * dtSec;
  state.car.position.x = clamp(
    state.car.position.x,
    0,
    state.config.trackWidth - state.config.carSize.width,
  );

  state.distance += state.forwardSpeed * dtSec;

  while (state.distance >= state.nextSpawnAt) {
    const obstacle = spawnObstacle(state);
    state.lastSpawnLane = obstacle.lane;
    state.obstacles.push(obstacle);
    const spacing = state.config.spawnBase + state.rng() * state.config.spawnVariance;
    state.nextSpawnAt += spacing;
  }

  state.obstacles.forEach((o) => {
    o.position.y += state.forwardSpeed * dtSec;
  });

  state.obstacles = state.obstacles.filter(
    (o) => o.position.y < state.config.trackHeight + state.config.obstacleSize.height,
  );

  for (const obstacle of state.obstacles) {
    resolveCollision(state, obstacle);
    if (state.crashed) break;
  }

  while (state.distance >= state.lapEndDistance) {
    const lapTime = state.timeSec - state.lapStartTime;
    if (lapTime > 0) state.lapTimes.push(lapTime);
    state.laps += 1;
    state.lapStartTime = state.timeSec;
    state.lapEndDistance += state.config.lapDistance;
  }

  state.car.heading = state.car.velocity.x / Math.max(state.config.maxLateralSpeed, 1);

  return state;
}
