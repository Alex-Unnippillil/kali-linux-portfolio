const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tileSize = 16;
const mapWidth = 80;
const mapHeight = 45;

// level data
let tiles = Array(mapHeight).fill(0).map(() => Array(mapWidth).fill(0));
let checkpoints = [];
let spawn = { x: 2 * tileSize, y: 2 * tileSize };

// input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') jumpBufferTimer = jumpBufferTime;
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// player
const player = {
  x: spawn.x,
  y: spawn.y,
  w: 14,
  h: 14,
  vx: 0,
  vy: 0,
  onGround: false,
  coyoteTimer: 0,
};

const gravity = 2000;
const moveSpeed = 200;
const jumpSpeed = 600;
const coyoteTime = 0.1;
const jumpBufferTime = 0.1;
let jumpBufferTimer = 0;

// camera
const camera = { x: 0, y: 0 };

// editor
let mode = 'play';
let currentTile = 1;
const modeBtn = document.getElementById('mode');
const exportBtn = document.getElementById('export');
const palette = document.getElementById('palette');
modeBtn.onclick = () => {
  mode = mode === 'play' ? 'edit' : 'play';
  modeBtn.textContent = mode === 'play' ? 'Edit' : 'Play';
  palette.classList.toggle('hidden', mode === 'play');
};
exportBtn.onclick = () => {
  const data = {
    tiles,
    spawn,
    checkpoints,
    width: mapWidth,
    height: mapHeight,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'level.json';
  a.click();
};
palette.addEventListener('click', e => {
  if (e.target.dataset.tile) currentTile = Number(e.target.dataset.tile);
});

canvas.addEventListener('click', e => {
  if (mode !== 'edit') return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left + camera.x) / tileSize);
  const y = Math.floor((e.clientY - rect.top + camera.y) / tileSize);
  if (x >= 0 && y >= 0 && x < mapWidth && y < mapHeight) {
    tiles[y][x] = currentTile;
    if (currentTile === 4) checkpoints.push({ x: x * tileSize, y: y * tileSize });
  }
});

// game loop
let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.1);
  last = ts;
  if (mode === 'play') update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  // horizontal movement
  player.vx = (keys['ArrowRight'] - keys['ArrowLeft']) * moveSpeed;

  // coyote time
  if (player.onGround) player.coyoteTimer = coyoteTime;
  else player.coyoteTimer -= dt;

  // jump buffering
  if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

  // jump
  if (jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
    player.vy = -jumpSpeed;
    player.onGround = false;
    jumpBufferTimer = 0;
  }

  // variable jump height
  if (!keys['Space'] && player.vy < 0) player.vy += gravity * dt * 0.5;

  // apply gravity
  player.vy += gravity * dt;

  movePlayer(dt);

  // respawn if fallen
  if (player.y > mapHeight * tileSize) respawn();

  // camera
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  if (camera.x < 0) camera.x = 0;
  if (camera.y < 0) camera.y = 0;
}

function respawn() {
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = player.vy = 0;
}

function movePlayer(dt) {
  let nx = player.x + player.vx * dt;
  let ny = player.y + player.vy * dt;
  // horizontal sweep
  const dirX = Math.sign(player.vx);
  if (dirX !== 0) {
    const rangeX = dirX > 0 ? [player.x + player.w, nx + player.w] : [nx, player.x];
    const startTileX = Math.floor(rangeX[0] / tileSize);
    const endTileX = Math.floor(rangeX[1] / tileSize);
    for (let tx = startTileX; dirX > 0 ? tx <= endTileX : tx >= endTileX; tx += dirX) {
      const minX = tx * tileSize;
      const maxX = minX + tileSize;
      const tilesTop = Math.floor(player.y / tileSize);
      const tilesBottom = Math.floor((player.y + player.h - 1) / tileSize);
      for (let ty = tilesTop; ty <= tilesBottom; ty++) {
        const t = getTile(tx, ty);
        if (t === 1 || t === 2 || t === 3) {
          if (dirX > 0) nx = Math.min(nx, minX - player.w);
          else nx = Math.max(nx, maxX);
        }
      }
    }
  }
  player.x = nx;

  // vertical sweep
  player.onGround = false;
  const dirY = Math.sign(player.vy);
  if (dirY !== 0) {
    const rangeY = dirY > 0 ? [player.y + player.h, ny + player.h] : [ny, player.y];
    const startTileY = Math.floor(rangeY[0] / tileSize);
    const endTileY = Math.floor(rangeY[1] / tileSize);
    for (let ty = startTileY; dirY > 0 ? ty <= endTileY : ty >= endTileY; ty += dirY) {
      const minY = ty * tileSize;
      const maxY = minY + tileSize;
      const tilesLeft = Math.floor(player.x / tileSize);
      const tilesRight = Math.floor((player.x + player.w - 1) / tileSize);
      for (let tx = tilesLeft; tx <= tilesRight; tx++) {
        const t = getTile(tx, ty);
        if (t === 1) {
          if (dirY > 0) {
            ny = Math.min(ny, minY - player.h);
            player.onGround = true;
          } else ny = Math.max(ny, maxY);
        } else if (dirY >= 0 && (t === 2 || t === 3)) {
          // slopes
          const localX = (player.x + player.w / 2) - tx * tileSize;
          let floorY;
          if (t === 2) floorY = minY + localX; // \ slope
          else floorY = maxY - localX; // / slope
          if (ny + player.h > floorY) {
            ny = floorY - player.h;
            player.onGround = true;
          }
        }
      }
    }
  }
  player.y = ny;

  // checkpoints
  const footX = Math.floor((player.x + player.w / 2) / tileSize);
  const footY = Math.floor((player.y + player.h + 1) / tileSize);
  const tileBelow = getTile(footX, footY);
  if (tileBelow === 4) {
    spawn = { x: footX * tileSize, y: footY * tileSize - player.h };
  }
}

function getTile(x, y) {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return 0;
  return tiles[y][x];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // parallax background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-camera.x * 0.5, -camera.y * 0.5, canvas.width * 2, canvas.height * 2);
  ctx.fillStyle = '#141414';
  ctx.fillRect(-camera.x * 0.2, -camera.y * 0.2, canvas.width * 2, canvas.height * 2);

  // tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const t = tiles[y][x];
      if (t === 0) continue;
      const screenX = x * tileSize - camera.x;
      const screenY = y * tileSize - camera.y;
      if (t === 1) {
        ctx.fillStyle = '#888';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      } else if (t === 2 || t === 3) {
        ctx.fillStyle = '#888';
        ctx.beginPath();
        if (t === 2) {
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + tileSize, screenY + tileSize);
          ctx.lineTo(screenX, screenY + tileSize);
        } else {
          ctx.moveTo(screenX + tileSize, screenY);
          ctx.lineTo(screenX + tileSize, screenY + tileSize);
          ctx.lineTo(screenX, screenY + tileSize);
        }
        ctx.closePath();
        ctx.fill();
      } else if (t === 4) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      }
    }
  }

  // player
  ctx.fillStyle = '#0f0';
  ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') respawn();
});
