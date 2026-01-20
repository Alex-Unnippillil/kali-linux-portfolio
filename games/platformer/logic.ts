export const TILE_SIZE = 32;

export const physics = {
  maxRunSpeed: 220,
  runAccel: 2400,
  groundFriction: 2800,
  airControlFactor: 0.55,
  gravity: 2400,
  maxFallSpeed: 900,
  jumpVelocity: -720,
  jumpCutMultiplier: 0.45,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
};

export const cameraDefaults = {
  deadZoneWidth: 160,
  deadZoneHeight: 90,
  followLerp: 0.12,
};

export type TileCode = 0 | 1 | 2 | 3 | 4; // empty, solid, spike, coin, goal

export type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  range: number;
  speed: number;
  dir: 1 | -1;
  deltaX: number;
};

export type LevelParse = {
  width: number;
  height: number;
  tiles: TileCode[][];
  spawn: { x: number; y: number };
  goal: { x: number; y: number };
  coins: number;
  platforms: Platform[];
};

export type InputState = {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
};

export type PlayerState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  onPlatformId: number | null;
  facing: 1 | -1;
};

export type GameState = {
  level: LevelParse;
  player: PlayerState;
  time: number;
  coinsCollected: number;
  deaths: number;
  status: 'running' | 'dead' | 'complete';
  respawnTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  camera: { x: number; y: number };
  shake: { time: number; magnitude: number };
};

export function parseLevel(grid: string[]): LevelParse {
  if (!grid.length) throw new Error('Level grid cannot be empty');
  const width = grid[0].length;
  const height = grid.length;
  const tiles: TileCode[][] = Array.from({ length: height }, () => Array(width).fill(0 as TileCode));
  const platforms: Platform[] = [];
  let spawn = { x: 0, y: 0 };
  let goal = { x: 0, y: 0 };
  let coins = 0;
  let platformId = 0;

  grid.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error('Level rows must have equal width');
    }
    [...row].forEach((ch, x) => {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      switch (ch) {
        case '#':
          tiles[y][x] = 1;
          break;
        case '^':
          tiles[y][x] = 2;
          break;
        case 'C':
          tiles[y][x] = 3;
          coins += 1;
          break;
        case 'G':
          tiles[y][x] = 4;
          goal = { x: px, y: py };
          break;
        case 'S':
          spawn = { x: px, y: py };
          break;
        case 'M':
          platforms.push({
            id: platformId++,
            x: px,
            y: py + TILE_SIZE - 16,
            width: 64,
            height: 16,
            originX: px,
            range: 96,
            speed: 70,
            dir: 1,
            deltaX: 0,
          });
          break;
        default:
          break;
      }
    });
  });

  return { width, height, tiles, spawn, goal, coins, platforms };
}

/**
 * Returns the aligned spawn position for a player rectangle.
 * Keeps spawn consistent between initial placement and respawns.
 */
export function getPlayerSpawn(level: LevelParse, playerW: number, playerH: number) {
  return {
    x: level.spawn.x + (TILE_SIZE - playerW) / 2,
    y: level.spawn.y + (TILE_SIZE - playerH),
  };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getTileBounds(x: number, y: number) {
  return { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
}

function gatherSolids(rect: { x: number; y: number; w: number; h: number }, level: LevelParse, platforms: Platform[]) {
  const minX = Math.max(0, Math.floor(rect.x / TILE_SIZE));
  const maxX = Math.min(level.width - 1, Math.floor((rect.x + rect.w) / TILE_SIZE));
  const minY = Math.max(0, Math.floor(rect.y / TILE_SIZE));
  const maxY = Math.min(level.height - 1, Math.floor((rect.y + rect.h) / TILE_SIZE));

  const solids: { x: number; y: number; w: number; h: number; platformId?: number }[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (level.tiles[y][x] === 1) solids.push(getTileBounds(x, y));
    }
  }
  platforms.forEach((p) => {
    if (overlaps(rect, { x: p.x, y: p.y, w: p.width, h: p.height })) {
      solids.push({ x: p.x, y: p.y, w: p.width, h: p.height, platformId: p.id });
    }
  });
  return solids;
}

function resolveAxis(rect: { x: number; y: number; w: number; h: number }, delta: number, level: LevelParse, platforms: Platform[], axis: 'x' | 'y') {
  let newRect = { ...rect };
  if (delta === 0) return { rect: newRect, hit: false, platformId: null as number | null };
  const dir = Math.sign(delta);
  newRect[axis] += delta;
  const solids = gatherSolids(newRect, level, platforms);
  let hit = false;
  let hitPlatform: number | null = null;
  solids.forEach((solid) => {
    if (!overlaps(newRect, solid)) return;
    hit = true;
    if (axis === 'x') {
      if (dir > 0) newRect.x = solid.x - rect.w;
      else newRect.x = solid.x + solid.w;
    } else {
      if (dir > 0) newRect.y = solid.y - rect.h;
      else newRect.y = solid.y + solid.h;
    }
    if (solid.platformId !== undefined) hitPlatform = solid.platformId;
  });
  return { rect: newRect, hit, platformId: hitPlatform };
}

// Axis-aligned resolution moves along X then Y so corner cases stay predictable and tiles remain solid.
export function resolveCollisionsAABB(player: PlayerState, level: LevelParse, platforms: Platform[], dt: number) {
  const rect = { x: player.x, y: player.y, w: player.w, h: player.h };
  const moveX = player.vx * dt;
  const moveY = player.vy * dt;

  let onGround = false;
  let onPlatformId: number | null = null;

  const resX = resolveAxis(rect, moveX, level, platforms, 'x');
  rect.x = resX.rect.x;
  if (resX.hit) player.vx = 0;

  const resY = resolveAxis(rect, moveY, level, platforms, 'y');
  rect.y = resY.rect.y;
  if (resY.hit) {
    player.vy = 0;
    if (moveY > 0) {
      onGround = true;
      onPlatformId = resY.platformId;
    }
  }

  return {
    x: rect.x,
    y: rect.y,
    onGround,
    onPlatformId,
  };
}

export function step(state: GameState, input: InputState, dt: number): GameState {
  if (state.status === 'complete') {
    return { ...state, time: state.time };
  }

  const next: GameState = {
    ...state,
    player: { ...state.player },
    level: state.level,
    camera: { ...state.camera },
    shake: { ...state.shake },
    status: state.status,
  };

  // update moving platforms first
  const platforms = state.level.platforms.map((p) => ({ ...p, deltaX: 0 }));
  platforms.forEach((p) => {
    const prevX = p.x;
    p.x += p.speed * p.dir * dt;
    if (p.x > p.originX + p.range) {
      p.x = p.originX + p.range;
      p.dir = -1;
    } else if (p.x < p.originX - p.range) {
      p.x = p.originX - p.range;
      p.dir = 1;
    }
    p.deltaX = p.x - prevX;
  });
  next.level = { ...state.level, platforms };

  if (next.status === 'dead') {
    const respawnTimer = Math.max(0, next.respawnTimer - dt);
    next.respawnTimer = respawnTimer;
    if (respawnTimer === 0) {
      const spawnPos = getPlayerSpawn(state.level, next.player.w, next.player.h);
      next.player.x = spawnPos.x;
      next.player.y = spawnPos.y;
      next.player.vx = 0;
      next.player.vy = 0;
      next.status = 'running';
      next.coyoteTimer = 0;
      next.jumpBufferTimer = 0;
      next.player.onGround = false;
      next.player.onPlatformId = null;
      next.shake.time = 0;
    }
    return next;
  }

  // timers and time tracking
  next.time += dt;
  next.coyoteTimer = next.player.onGround ? physics.coyoteTime : Math.max(0, next.coyoteTimer - dt);
  if (input.jumpPressed) {
    next.jumpBufferTimer = physics.jumpBuffer;
  } else {
    next.jumpBufferTimer = Math.max(0, next.jumpBufferTimer - dt);
  }

  // apply platform carry if standing
  if (next.player.onPlatformId !== null) {
    const platform = platforms.find((p) => p.id === next.player.onPlatformId);
    if (platform) {
      next.player.x += platform.deltaX;
    }
  }

  // movement input
  const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const accel = physics.runAccel * (next.player.onGround ? 1 : physics.airControlFactor);
  next.player.vx += moveDir * accel * dt;

  // friction
  if (next.player.onGround && moveDir === 0) {
    const friction = physics.groundFriction * dt * Math.sign(next.player.vx);
    if (Math.abs(friction) > Math.abs(next.player.vx)) next.player.vx = 0;
    else next.player.vx -= friction;
  }

  if (next.player.vx > physics.maxRunSpeed) next.player.vx = physics.maxRunSpeed;
  if (next.player.vx < -physics.maxRunSpeed) next.player.vx = -physics.maxRunSpeed;

  // gravity
  next.player.vy += physics.gravity * dt;
  if (next.player.vy > physics.maxFallSpeed) next.player.vy = physics.maxFallSpeed;

  // jumping
  const canJump = next.player.onGround || next.coyoteTimer > 0;
  if (next.jumpBufferTimer > 0 && canJump) {
    next.player.vy = physics.jumpVelocity;
    next.player.onGround = false;
    next.coyoteTimer = 0;
    next.jumpBufferTimer = 0;
  }

  if (input.jumpReleased && next.player.vy < 0) {
    next.player.vy *= physics.jumpCutMultiplier;
  }

  if (moveDir !== 0) next.player.facing = moveDir > 0 ? 1 : -1;

  // collisions
  const collisionResult = resolveCollisionsAABB(next.player, next.level, platforms, dt);
  next.player.x = collisionResult.x;
  next.player.y = collisionResult.y;
  next.player.onGround = collisionResult.onGround;
  next.player.onPlatformId = collisionResult.onPlatformId;

  // hazard check
  const footTileX = Math.floor((next.player.x + next.player.w * 0.5) / TILE_SIZE);
  const footTileY = Math.floor((next.player.y + next.player.h * 0.8) / TILE_SIZE);
  const hazardTile = next.level.tiles[footTileY]?.[footTileX];
  const fellOut = next.player.y > next.level.height * TILE_SIZE + TILE_SIZE * 2;
  if (hazardTile === 2 || fellOut) {
    next.deaths += 1;
    next.status = 'dead';
    next.respawnTimer = 0.35;
    next.shake = { time: 0.2, magnitude: 4 };
    return next;
  }

  // coin collection
  const minTileX = Math.floor(next.player.x / TILE_SIZE);
  const maxTileX = Math.floor((next.player.x + next.player.w) / TILE_SIZE);
  const minTileY = Math.floor(next.player.y / TILE_SIZE);
  const maxTileY = Math.floor((next.player.y + next.player.h) / TILE_SIZE);
  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      if (next.level.tiles[y]?.[x] === 3) {
        next.level.tiles[y][x] = 0;
        next.coinsCollected += 1;
      }
    }
  }

  // goal
  const centerTileX = Math.floor((next.player.x + next.player.w / 2) / TILE_SIZE);
  const centerTileY = Math.floor((next.player.y + next.player.h / 2) / TILE_SIZE);
  if (next.level.tiles[centerTileY]?.[centerTileX] === 4) {
    next.status = 'complete';
  }

  // camera follow with dead zone
  const desiredCamX = next.player.x + next.player.w / 2;
  const desiredCamY = next.player.y + next.player.h / 2;
  const dzX = cameraDefaults.deadZoneWidth * 0.5;
  const dzY = cameraDefaults.deadZoneHeight * 0.5;
  let camTargetX = next.camera.x;
  let camTargetY = next.camera.y;
  if (desiredCamX < next.camera.x - dzX) camTargetX = desiredCamX + dzX;
  else if (desiredCamX > next.camera.x + dzX) camTargetX = desiredCamX - dzX;
  if (desiredCamY < next.camera.y - dzY) camTargetY = desiredCamY + dzY;
  else if (desiredCamY > next.camera.y + dzY) camTargetY = desiredCamY - dzY;

  const levelPxWidth = next.level.width * TILE_SIZE;
  const levelPxHeight = next.level.height * TILE_SIZE;
  const halfWidth = cameraDefaults.deadZoneWidth * 1.5;
  const halfHeight = cameraDefaults.deadZoneHeight * 1.5;
  camTargetX = Math.max(halfWidth, Math.min(levelPxWidth - halfWidth, camTargetX));
  camTargetY = Math.max(halfHeight, Math.min(levelPxHeight - halfHeight, camTargetY));
  next.camera.x += (camTargetX - next.camera.x) * cameraDefaults.followLerp;
  next.camera.y += (camTargetY - next.camera.y) * cameraDefaults.followLerp;

  // shake decay
  if (next.shake.time > 0) {
    next.shake.time = Math.max(0, next.shake.time - dt);
    if (next.shake.time === 0) next.shake.magnitude = 0;
  }

  return next;
}
