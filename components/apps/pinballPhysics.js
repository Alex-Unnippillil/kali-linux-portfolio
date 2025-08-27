export const WIDTH = 400;
export const HEIGHT = 500;
export const FLOOR = HEIGHT - 20;
const GRAVITY = 500; // px per second^2
export const TILT_THRESHOLD = 40; // swipe distance triggering tilt
export const TILT_DURATION = 1; // seconds flippers disabled
export const FLIPPER_SCORE = 10;
export const BUMPER_SCORE = 50;

function randomDirection() {
  return Math.random() > 0.5 ? 1 : -1;
}

export function createGame() {
  return {
    ball: { x: WIDTH / 2, y: 50, vx: 100 * randomDirection(), vy: 0, r: 8 },
    flippers: { left: false, right: false },
    bumpers: [
      { x: WIDTH / 3, y: 150, r: 15, litTime: 0 },
      { x: (2 * WIDTH) / 3, y: 150, r: 15, litTime: 0 },
      { x: WIDTH / 2, y: 220, r: 15, litTime: 0 },
    ],
    score: 0,
    tiltTime: 0,
  };
}

export function flippersEnabled(game) {
  return game.tiltTime <= 0;
}

export function handleFlipperHit(game, side) {
  game.ball.vy = -300;
  game.ball.vx = side === 'left' ? -150 : 150;
  game.score += FLIPPER_SCORE;
}

export function nudge(game, force) {
  game.ball.vx += force;
  if (Math.abs(force) > TILT_THRESHOLD) {
    game.tiltTime = TILT_DURATION;
  }
}

function resetBall(ball) {
  ball.x = WIDTH / 2;
  ball.y = 50;
  ball.vx = 100 * randomDirection();
  ball.vy = 0;
}

export function update(game, dt) {
  const { ball, bumpers } = game;

  // update tilt timer
  if (game.tiltTime > 0) {
    game.tiltTime = Math.max(0, game.tiltTime - dt);
  }

  // apply gravity
  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // wall collisions
  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.vx *= -1;
  }
  if (ball.x > WIDTH - ball.r) {
    ball.x = WIDTH - ball.r;
    ball.vx *= -1;
  }
  if (ball.y < ball.r) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  // floor and flippers
  if (ball.y + ball.r > FLOOR) {
    if (flippersEnabled(game)) {
      if (game.flippers.left && ball.x < WIDTH / 2) {
        handleFlipperHit(game, 'left');
      } else if (game.flippers.right && ball.x >= WIDTH / 2) {
        handleFlipperHit(game, 'right');
      } else {
        resetBall(ball);
      }
    } else {
      resetBall(ball);
    }
  }

  // bumper collisions
  bumpers.forEach((b) => {
    const dx = ball.x - b.x;
    const dy = ball.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.r + b.r) {
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const angle = Math.atan2(dy, dx);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      game.score += BUMPER_SCORE;
      b.litTime = 0.3;
    }
    if (b.litTime > 0) {
      b.litTime = Math.max(0, b.litTime - dt);
    }
  });
}

