export const COYOTE_TIME = 0.1; // 100ms
export const JUMP_BUFFER_TIME = 0.1; // 100ms
export const GRAVITY = 2000;
export const ACCEL = 1200;
export const FRICTION = 800;
export const MAX_SPEED = 200;
export const JUMP_SPEED = 600;

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

export function updatePhysics(player, input, dt) {
  // horizontal acceleration and friction
  if (input.right) {
    player.vx += ACCEL * dt;
  } else if (input.left) {
    player.vx -= ACCEL * dt;
  } else {
    if (player.vx > 0) player.vx = Math.max(0, player.vx - FRICTION * dt);
    else if (player.vx < 0) player.vx = Math.min(0, player.vx + FRICTION * dt);
  }
  // clamp horizontal speed
  if (player.vx > MAX_SPEED) player.vx = MAX_SPEED;
  if (player.vx < -MAX_SPEED) player.vx = -MAX_SPEED;

  // timers
  if (player.onGround) player.coyoteTimer = COYOTE_TIME;
  else player.coyoteTimer -= dt;

  if (input.jump) player.jumpBufferTimer = JUMP_BUFFER_TIME;
  else player.jumpBufferTimer -= dt;

  // jump
  if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    player.jumpBufferTimer = 0;
  }

  // variable jump height
  if (!input.jump && player.vy < 0) player.vy += GRAVITY * dt * 0.5;

  // gravity
  player.vy += GRAVITY * dt;

  // clamp vertical speed
  if (player.vy > 1000) player.vy = 1000;
  if (player.vy < -1000) player.vy = -1000;
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
          if (dirY > 0) {
            ny = Math.min(ny, minY - player.h);
            player.onGround = true;
          } else {
            ny = Math.max(ny, maxY);
          }
        }
      }
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
          if (dirX > 0) nx = Math.min(nx, minX - player.w);
          else nx = Math.max(nx, maxX);
        }
      }
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
