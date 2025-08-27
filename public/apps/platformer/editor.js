import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js';

const { Engine, World, Bodies, Body } = Matter;

const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d');

const tileSize = 32;
const rows = 15;
const cols = 20;
canvas.width = cols * tileSize;
canvas.height = rows * tileSize;

const engine = Engine.create();
const world = engine.world;

const tiles = [];
const tileBodies = new Map();
for (let y = 0; y < rows; y++) {
  tiles[y] = [];
  for (let x = 0; x < cols; x++) tiles[y][x] = 0;
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function updateTileBody(x, y) {
  const key = tileKey(x, y);
  const existing = tileBodies.get(key);
  if (existing) {
    World.remove(world, existing);
    tileBodies.delete(key);
  }
  if (tiles[y][x] === 1) {
    const body = Bodies.rectangle(
      x * tileSize + tileSize / 2,
      y * tileSize + tileSize / 2,
      tileSize,
      tileSize,
      { isStatic: true }
    );
    tileBodies.set(key, body);
    World.add(world, body);
  }
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  tiles[y][x] = tiles[y][x] === 1 ? 0 : 1;
  updateTileBody(x, y);
});

const player = Bodies.rectangle(80, 80, 14, 14);
World.add(world, player);

const keys = {};
window.addEventListener('keydown', e => (keys[e.code] = true));
window.addEventListener('keyup', e => (keys[e.code] = false));

function update(dt) {
  const force = 0.002;
  if (keys['ArrowLeft']) Body.applyForce(player, player.position, { x: -force, y: 0 });
  if (keys['ArrowRight']) Body.applyForce(player, player.position, { x: force, y: 0 });
  if (keys['Space'] && Math.abs(player.velocity.y) < 0.01)
    Body.applyForce(player, player.position, { x: 0, y: -0.05 });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (tiles[y][x] === 1) {
        ctx.fillStyle = '#888';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  ctx.fillStyle = 'green';
  ctx.fillRect(
    player.position.x - 7,
    player.position.y - 7,
    14,
    14
  );
}

let last = performance.now();
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  update(dt);
  Matter.Engine.update(engine, dt * 1000);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

