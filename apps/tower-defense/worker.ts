import {
  ENEMY_TYPES,
  Tower,
  Enemy,
  createEnemyPool,
  spawnEnemy,
} from '../games/tower-defense';

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

interface Cell { x: number; y: number }

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

interface InitMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  path: Cell[];
  towers: Tower[];
}

type WorkerMessage =
  | InitMessage
  | { type: 'path'; path: Cell[] }
  | { type: 'towers'; towers: Tower[] }
  | { type: 'highlight'; selected: number | null; hovered: number | null }
  | { type: 'start' };

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let path: Cell[] = [];
let towers: Tower[] = [];
let selected: number | null = null;
let hovered: number | null = null;
const enemies: EnemyInstance[] = [];
const enemyPool = createEnemyPool(50);
let lastTime = 0;
let running = false;
let spawnTimer = 0;
let wave = 1;
let waveCountdown: number | null = null;
let enemiesSpawned = 0;
const damageNumbers: { x: number; y: number; value: number; life: number }[] = [];
const damageTicks: { x: number; y: number; life: number }[] = [];

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.strokeStyle = '#555';
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,0,0.2)';
  path.forEach((c) => {
    ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = 'yellow';
    ctx.strokeRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  });
  ctx.fillStyle = 'blue';
  towers.forEach((t, i) => {
    ctx.beginPath();
    ctx.arc(
      t.x * CELL_SIZE + CELL_SIZE / 2,
      t.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (selected === i || hovered === i) {
      ctx.strokeStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        t.range * CELL_SIZE,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  });
  ctx.fillStyle = 'red';
  enemies.forEach((en) => {
    ctx.beginPath();
    ctx.arc(
      en.x * CELL_SIZE + CELL_SIZE / 2,
      en.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  damageTicks.forEach((t) => {
    ctx.strokeStyle = `rgba(255,0,0,${t.life})`;
    ctx.beginPath();
    ctx.arc(
      t.x * CELL_SIZE + CELL_SIZE / 2,
      t.y * CELL_SIZE + CELL_SIZE / 2,
      (CELL_SIZE / 2) * (1 - t.life),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  });
  damageNumbers.forEach((d) => {
    ctx.fillStyle = `rgba(255,255,255,${d.life})`;
    ctx.font = '12px sans-serif';
    ctx.fillText(
      d.value.toString(),
      d.x * CELL_SIZE + CELL_SIZE / 2,
      d.y * CELL_SIZE + CELL_SIZE / 2 - (1 - d.life) * 10,
    );
  });
}

function spawnEnemyInstance() {
  if (!path.length) return;
  const types = Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[];
  const type = types[Math.floor(Math.random() * types.length)];
  const spec = ENEMY_TYPES[type];
  const enemy = spawnEnemy(enemyPool, {
    id: Date.now(),
    x: path[0].x,
    y: path[0].y,
    pathIndex: 0,
    progress: 0,
    health: spec.health,
    resistance: 0,
    baseSpeed: spec.speed,
    slow: null,
    dot: null,
    type,
  });
  if (enemy) enemies.push(enemy as EnemyInstance);
}

function update(time: number) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (waveCountdown !== null) {
    waveCountdown -= dt;
    if (waveCountdown <= 0) {
      waveCountdown = null;
      running = true;
      spawnTimer = 0;
      enemiesSpawned = 0;
    }
  } else if (running) {
    spawnTimer += dt;
    if (spawnTimer > 1 && enemiesSpawned < wave * 5) {
      spawnTimer = 0;
      spawnEnemyInstance();
      enemiesSpawned += 1;
    }
    enemies.forEach((en) => {
      const next = path[en.pathIndex + 1];
      if (!next) return;
      const dx = next.x - en.x;
      const dy = next.y - en.y;
      const dist = Math.hypot(dx, dy);
      const step = (en.baseSpeed * dt) / CELL_SIZE;
      if (step >= dist) {
        en.x = next.x;
        en.y = next.y;
        en.pathIndex += 1;
      } else {
        en.x += (dx / dist) * step;
        en.y += (dy / dist) * step;
      }
    });
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const e = enemies[i];
      const reached = e.pathIndex >= path.length - 1;
      if (e.health <= 0 || reached) enemies.splice(i, 1);
    }
    towers.forEach((t) => {
      (t as any).cool = (t as any).cool ? (t as any).cool - dt : 0;
      if ((t as any).cool <= 0) {
        const enemy = enemies.find(
          (e) => Math.hypot(e.x - t.x, e.y - t.y) <= t.range,
        );
        if (enemy) {
          enemy.health -= t.damage;
          damageNumbers.push({
            x: enemy.x,
            y: enemy.y,
            value: t.damage,
            life: 1,
          });
          damageTicks.push({ x: enemy.x, y: enemy.y, life: 1 });
          (t as any).cool = 1;
        }
      }
    });
    damageNumbers.forEach((d) => {
      d.y -= dt * 0.5;
      d.life -= dt * 2;
    });
    for (let i = damageNumbers.length - 1; i >= 0; i -= 1) {
      if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1);
    }
    damageTicks.forEach((t) => {
      t.life -= dt * 2;
    });
    for (let i = damageTicks.length - 1; i >= 0; i -= 1) {
      if (damageTicks[i].life <= 0) damageTicks.splice(i, 1);
    }
    if (enemiesSpawned >= wave * 5 && enemies.length === 0) {
      running = false;
      wave += 1;
      waveCountdown = 5;
    }
  }

  draw();
  self.postMessage({ type: 'state', wave, countdown: waveCountdown });
  requestAnimationFrame(update);
}

self.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
  if (data.type === 'init') {
    path = data.path;
    towers = data.towers;
    ctx = data.canvas.getContext('2d');
    lastTime = performance.now();
    requestAnimationFrame(update);
  } else if (data.type === 'path') {
    path = data.path;
  } else if (data.type === 'towers') {
    towers = data.towers;
  } else if (data.type === 'highlight') {
    selected = data.selected;
    hovered = data.hovered;
  } else if (data.type === 'start') {
    running = false;
    wave = 1;
    waveCountdown = 3;
    enemies.length = 0;
    damageNumbers.length = 0;
    damageTicks.length = 0;
  }
};

export {};

