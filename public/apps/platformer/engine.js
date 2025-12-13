export const COYOTE_TIME = 0.1; // 100ms
export const JUMP_BUFFER_TIME = 0.1; // 100ms default

// physics parameters are mutable so the game can expose sliders
export const physics = {
  GRAVITY: 2000,
  ACCEL: 1200,
  FRICTION: 800,
  MAX_SPEED: 200,
  JUMP_SPEED: 600,
};

export function setPhysics(values) {
  Object.assign(physics, values);
}

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 14;
    this.h = 14;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }
}

export function updatePhysics(player, input, dt, opts = {}) {
  // horizontal acceleration and friction
  if (input.right) {
    player.vx += physics.ACCEL * dt;
  } else if (input.left) {
    player.vx -= physics.ACCEL * dt;
  } else {
    if (player.vx > 0) player.vx = Math.max(0, player.vx - physics.FRICTION * dt);
    else if (player.vx < 0) player.vx = Math.min(0, player.vx + physics.FRICTION * dt);
  }
  // clamp horizontal speed
  if (player.vx > physics.MAX_SPEED) player.vx = physics.MAX_SPEED;
  if (player.vx < -physics.MAX_SPEED) player.vx = -physics.MAX_SPEED;

  // timers
  if (player.onGround) player.coyoteTimer = COYOTE_TIME;
  else player.coyoteTimer -= dt;

  const jumpBuffer = opts.jumpBuffer ?? JUMP_BUFFER_TIME;
  if (input.jumpPressed) player.jumpBufferTimer = jumpBuffer;
  else player.jumpBufferTimer -= dt;

  // jump
  let jumped = false;
  if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
    player.vy = -physics.JUMP_SPEED;
    player.onGround = false;
    player.jumpBufferTimer = 0;
    jumped = true;
  }

  // variable jump height
  if (!input.jumpHeld && player.vy < 0) player.vy += physics.GRAVITY * dt * 0.5;

  // gravity
  player.vy += physics.GRAVITY * dt;

  // clamp vertical speed
  if (player.vy > 1000) player.vy = 1000;
  if (player.vy < -1000) player.vy = -1000;
  return jumped;
}

export function movePlayer(player, tiles, tileSize, dt) {
  const getTile = (x, y) =>
    tiles[y] && tiles[y][x] !== undefined ? tiles[y][x] : 0;

  let ny = player.y + player.vy * dt;
  player.onGround = false;
  const dirY = Math.sign(player.vy);
  if (dirY !== 0) {
    const rangeY =
      dirY > 0
        ? [player.y + player.h, ny + player.h]
        : [ny, player.y];
    const startTileY = Math.floor(rangeY[0] / tileSize);
    const endTileY = Math.floor(rangeY[1] / tileSize);
    let collidedY = false;
    for (
      let ty = startTileY;
      dirY > 0 ? ty <= endTileY : ty >= endTileY;
      ty += dirY
    ) {
      const minY = ty * tileSize;
      const maxY = minY + tileSize;
      const tilesLeft = Math.floor(player.x / tileSize);
      const tilesRight = Math.floor(
        (player.x + player.w - 1) / tileSize
      );
      for (let tx = tilesLeft; tx <= tilesRight; tx++) {
        if (getTile(tx, ty) === 1) {
          collidedY = true;
          if (dirY > 0) {
            ny = Math.min(ny, minY - player.h);
            player.onGround = true;
          } else {
            ny = Math.max(ny, maxY);
          }
          player.vy = 0;
          break;
        }
      }
      if (collidedY) break;
    }
  }
  player.y = ny;

  let nx = player.x + player.vx * dt;
  const dirX = Math.sign(player.vx);
  if (dirX !== 0) {
    const rangeX =
      dirX > 0
        ? [player.x + player.w, nx + player.w]
        : [nx, player.x];
    const startTileX = Math.floor(rangeX[0] / tileSize);
    const endTileX = Math.floor(rangeX[1] / tileSize);
    let collidedX = false;
    for (
      let tx = startTileX;
      dirX > 0 ? tx <= endTileX : tx >= endTileX;
      tx += dirX
    ) {
      const minX = tx * tileSize;
      const maxX = minX + tileSize;
      const tilesTop = Math.floor(player.y / tileSize);
      const tilesBottom = Math.floor(
        (player.y + player.h - 1) / tileSize
      );
      for (let ty = tilesTop; ty <= tilesBottom; ty++) {
        if (getTile(tx, ty) === 1) {
          collidedX = true;
          if (dirX > 0) nx = Math.min(nx, minX - player.w);
          else nx = Math.max(nx, maxX);
          player.vx = 0;
          break;
        }
      }
      if (collidedX) break;
    }
  }
  player.x = nx;
}

export function collectCoin(tiles, x, y) {
  if (tiles[y] && tiles[y][x] === 5) {
    tiles[y][x] = 0;
    return true;
  }
  return false;
}

export function countCoins(tiles) {
  let total = 0;
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      if (tiles[y][x] === 5) total++;
    }
  }
  return total;
}

export function isLevelComplete(coinsRemaining, coinsTotal) {
  return coinsTotal > 0 && coinsRemaining <= 0;
}
