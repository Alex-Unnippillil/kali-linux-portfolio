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

export function collectCoin(tiles, x, y) {
  if (tiles[y] && tiles[y][x] === 5) {
    tiles[y][x] = 0;
    return true;
  }
  return false;
}

export function hitHazard(tiles, x, y) {
  return !!(tiles[y] && tiles[y][x] === 4);
}
