export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  shape: number[];
}

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  cooldown: number;
}

export interface GameState {
  width: number;
  height: number;
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  keys: Record<string, boolean>;
  score: number;
  lives: number;
  paused: boolean;
}

const BASE_ACCEL = 0.1;
const BASE_ROTATION = 0.05;
const BULLET_SPEED = 5;
const BULLET_LIFE = 1; // seconds
const FRICTION = 0.99;
const COOLDOWN = 0.16; // seconds
const INITIAL_ASTEROIDS = 4;

const normalizeAngle = (angle: number) => {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
};

export const createGameState = (width: number, height: number): GameState => {
  const ship: Ship = {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    cooldown: 0,
  };

  const state: GameState = {
    width,
    height,
    ship,
    asteroids: [],
    bullets: [],
    keys: {},
    score: 0,
    lives: 3,
    paused: false,
  };

  for (let i = 0; i < INITIAL_ASTEROIDS; i += 1) {
    spawnAsteroid(state);
  }

  return state;
};

export const resetGameState = (state: GameState) => {
  const fresh = createGameState(state.width, state.height);
  Object.assign(state, fresh);
};

export const resizeGameState = (
  state: GameState,
  width: number,
  height: number
) => {
  state.width = width;
  state.height = height;
  state.ship.x = width / 2;
  state.ship.y = height / 2;
};

function spawnAsteroid(state: GameState) {
  const r = 20 + Math.random() * 30;
  const x = Math.random() * state.width;
  const y = Math.random() * state.height;
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.5 + Math.random();
  const points: number[] = [];
  const verts = 8;
  for (let i = 0; i < verts; i += 1) {
    const theta = (i / verts) * Math.PI * 2;
    const offset = (Math.random() * 0.4 - 0.2) * r;
    points.push(Math.cos(theta) * r + offset);
    points.push(Math.sin(theta) * r + offset);
  }
  state.asteroids.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    shape: points,
  });
}

const wrapObject = (
  obj: { x: number; y: number },
  width: number,
  height: number
) => {
  if (obj.x < -20) obj.x = width + 20;
  if (obj.x > width + 20) obj.x = -20;
  if (obj.y < -20) obj.y = height + 20;
  if (obj.y > height + 20) obj.y = -20;
};

const fireBullet = (state: GameState) => {
  const { ship } = state;
  state.bullets.push({
    x: ship.x + Math.cos(ship.angle) * 10,
    y: ship.y + Math.sin(ship.angle) * 10,
    vx: Math.cos(ship.angle) * BULLET_SPEED,
    vy: Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFE,
  });
  ship.cooldown = COOLDOWN;
};

export const handleKey = (
  state: GameState,
  key: string,
  pressed: boolean
) => {
  if (key === 'Escape' && pressed && !state.keys[key]) {
    state.paused = !state.paused;
  }

  state.keys[key] = pressed;
};

export const setPaused = (state: GameState, paused: boolean) => {
  state.paused = paused;
  state.keys['Escape'] = false;
};

export const updateGameState = (state: GameState, dt: number) => {
  if (state.paused) return;

  const frameFactor = dt * 60;
  const { ship } = state;

  if (state.keys['ArrowLeft']) ship.angle -= BASE_ROTATION * frameFactor;
  if (state.keys['ArrowRight']) ship.angle += BASE_ROTATION * frameFactor;
  ship.angle = normalizeAngle(ship.angle);

  if (state.keys['ArrowUp']) {
    ship.vx += Math.cos(ship.angle) * BASE_ACCEL * frameFactor;
    ship.vy += Math.sin(ship.angle) * BASE_ACCEL * frameFactor;
  }

  ship.x += ship.vx * frameFactor;
  ship.y += ship.vy * frameFactor;
  const friction = Math.pow(FRICTION, frameFactor);
  ship.vx *= friction;
  ship.vy *= friction;
  wrapObject(ship, state.width, state.height);

  if (ship.cooldown > 0) {
    ship.cooldown = Math.max(0, ship.cooldown - dt);
  }
  if (state.keys[' '] && ship.cooldown <= 0) {
    fireBullet(state);
  }

  state.bullets.forEach((b) => {
    b.x += b.vx * frameFactor;
    b.y += b.vy * frameFactor;
    wrapObject(b, state.width, state.height);
    b.life -= dt;
  });
  state.bullets = state.bullets.filter((b) => b.life > 0);

  state.asteroids.forEach((a) => {
    a.x += a.vx * frameFactor;
    a.y += a.vy * frameFactor;
    wrapObject(a, state.width, state.height);
  });

  // bullet collisions
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
      const a = state.asteroids[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) < a.r) {
        state.asteroids.splice(j, 1);
        state.bullets.splice(i, 1);
        state.score += 100;
        spawnAsteroid(state);
        break;
      }
    }
  }

  // ship collisions
  for (let i = 0; i < state.asteroids.length; i += 1) {
    const a = state.asteroids[i];
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    if (Math.hypot(dx, dy) < a.r + 10) {
      state.lives = Math.max(0, state.lives - 1);
      ship.x = state.width / 2;
      ship.y = state.height / 2;
      ship.vx = 0;
      ship.vy = 0;
      ship.angle = 0;
      ship.cooldown = 0;
      break;
    }
  }
};

export const drawGameState = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  dpr = 1
) => {
  ctx.clearRect(0, 0, state.width * dpr, state.height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 4;

  const ship = state.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-10, 8);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, -8);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  state.asteroids.forEach((a) => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.beginPath();
    const pts = a.shape;
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });

  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 0;
  state.bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
};

