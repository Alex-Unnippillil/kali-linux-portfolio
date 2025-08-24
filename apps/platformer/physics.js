export const COYOTE_TIME = 0.1; // 100ms
export const JUMP_BUFFER_TIME = 0.1; // 100ms
export const GRAVITY = 2000;
export const ACCEL = 1200;
export const FRICTION = 800;
export const MAX_SPEED = 200;
export const JUMP_SPEED = 600;

export const ACCEL_RATE = 12;
export const FRICTION_RATE = 20;
const MAX_STEP = 1 / 60; // fixed step for consistent physics

function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function resolveHorizontal(player, terrain) {
  const tileSize = terrain.tileSize;
  if (player.vx > 0) {
    const right = Math.floor((player.x + player.w - 1) / tileSize);
    const top = Math.floor(player.y / tileSize);
    const bottom = Math.floor((player.y + player.h - 1) / tileSize);
    for (let ty = top; ty <= bottom; ty++) {
      if (terrain.isSolid(right, ty)) {
        player.x = right * tileSize - player.w;
        player.vx = 0;
        break;
      }
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / tileSize);
    const top = Math.floor(player.y / tileSize);
    const bottom = Math.floor((player.y + player.h - 1) / tileSize);
    for (let ty = top; ty <= bottom; ty++) {
      if (terrain.isSolid(left, ty)) {
        player.x = (left + 1) * tileSize;
        player.vx = 0;
        break;
      }
    }
  }
}

function resolveVertical(player, terrain) {
  const tileSize = terrain.tileSize;
  if (player.vy >= 0) {
    const bottom = Math.floor((player.y + player.h - 1) / tileSize);
    const left = Math.floor(player.x / tileSize);
    const right = Math.floor((player.x + player.w - 1) / tileSize);
    let grounded = false;
    for (let tx = left; tx <= right; tx++) {
      const tile = terrain.getTile(tx, bottom);
      if (terrain.isSlopeTile(tile)) {
        const localX = player.x + player.w / 2 - tx * tileSize;
        const surfaceY = bottom * tileSize + terrain.getSlopeY(tile, localX);
        if (player.y + player.h > surfaceY) {
          player.y = surfaceY - player.h;
          player.vy = 0;
          grounded = true;
          break;
        }
      } else if (terrain.isSolid(tx, bottom)) {
        player.y = bottom * tileSize - player.h;
        player.vy = 0;
        grounded = true;
        break;
      }
    }
    player.onGround = grounded;
  } else {
    const top = Math.floor(player.y / tileSize);
    const left = Math.floor(player.x / tileSize);
    const right = Math.floor((player.x + player.w - 1) / tileSize);
    for (let tx = left; tx <= right; tx++) {
      if (terrain.isSolid(tx, top)) {
        player.y = (top + 1) * tileSize;
        player.vy = 0;
        break;
      }
    }
    // check if standing on ground after moving up
    const checkBottom = Math.floor((player.y + player.h) / tileSize);
    let grounded = false;
    for (let tx = left; tx <= right; tx++) {
      const tile = terrain.getTile(tx, checkBottom);
      if (terrain.isSlopeTile(tile)) {
        const localX = player.x + player.w / 2 - tx * tileSize;
        const surfaceY = checkBottom * tileSize + terrain.getSlopeY(tile, localX);
        if (player.y + player.h >= surfaceY - 1) {
          grounded = true;
          break;
        }
      } else if (terrain.isSolid(tx, checkBottom)) {
        grounded = true;
        break;
      }
    }
    player.onGround = grounded;
  }
}

export function updatePhysics(player, input, dt, terrain = null) {
  let remaining = dt;
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP);

    const targetSpeed = input.right ? MAX_SPEED : input.left ? -MAX_SPEED : 0;
    const rate = targetSpeed === 0 ? FRICTION_RATE : ACCEL_RATE;
    player.vx = approach(player.vx, targetSpeed, rate, step);

    // timers
    if (player.onGround) player.coyoteTimer = COYOTE_TIME;
    else player.coyoteTimer -= step;

    if (input.jump) player.jumpBufferTimer = JUMP_BUFFER_TIME;
    else player.jumpBufferTimer -= step;

    if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
      player.vy = -JUMP_SPEED;
      player.onGround = false;
      player.jumpBufferTimer = 0;
    }

    if (!input.jump && player.vy < 0) player.vy += GRAVITY * step * 0.5;

    player.vy += GRAVITY * step;

    // integrate
    player.onGround = false;
    player.x += player.vx * step;
    if (terrain) resolveHorizontal(player, terrain);
    player.y += player.vy * step;
    if (terrain) resolveVertical(player, terrain);

    remaining -= step;
  }
}
