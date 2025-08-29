const tileSize = 16;
const width = 20;
const height = 10;

const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d');

const tiles = Array.from({ length: height }, () => Array(width).fill(0));
let spawn = { x: 0, y: 0 };
let current = 1;

const palette = document.getElementById('palette');
const filenameEl = document.getElementById('filename');
const types = [
  { id: 0, color: '#222', label: '0' },
  { id: 1, color: '#777', label: '1' },
  { id: 2, color: 'red', label: '2' },
  { id: 5, color: 'gold', label: '5' },
  { id: 6, color: 'blue', label: '6' },
];

types.forEach((t) => {
  const b = document.createElement('button');
  b.textContent = t.label;
  b.style.background = t.color;
  b.addEventListener('click', () => (current = t.id));
  palette.appendChild(b);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y][x];
      if (t === 1) {
        ctx.fillStyle = '#666';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else if (t === 2) {
        ctx.fillStyle = 'red';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else if (t === 5) {
        ctx.fillStyle = 'gold';
        ctx.fillRect(
          x * tileSize + 4,
          y * tileSize + 4,
          tileSize - 8,
          tileSize - 8
        );
      } else if (t === 6) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }
  // spawn marker
  ctx.strokeStyle = 'lime';
  ctx.strokeRect(spawn.x, spawn.y, tileSize, tileSize);
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, height * tileSize);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(width * tileSize, y * tileSize);
    ctx.stroke();
  }
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  if (e.button === 2) {
    spawn = { x: x * tileSize, y: y * tileSize };
  } else {
    tiles[y][x] = current;
  }
  draw();
});

draw();

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = { width, height, tiles, spawn };
  document.getElementById('output').value = JSON.stringify(data);
});

async function getRootDir() {
  if (!navigator.storage?.getDirectory) throw new Error('OPFS not supported');
  return await navigator.storage.getDirectory();
}

async function saveFile(name, data) {
  const root = await getRootDir();
  const handle = await root.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function loadFile(name) {
  const root = await getRootDir();
  const handle = await root.getFileHandle(name);
  const file = await handle.getFile();
  return await file.text();
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const name = filenameEl.value || 'level.json';
  const data = JSON.stringify({ width, height, tiles, spawn });
  await saveFile(name, data);
});

document.getElementById('loadBtn').addEventListener('click', async () => {
  const name = filenameEl.value || 'level.json';
  try {
    const text = await loadFile(name);
    const data = JSON.parse(text);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles[y][x] = data.tiles[y][x] || 0;
      }
    }
    spawn = data.spawn;
    draw();
  } catch (e) {
    console.error(e);
  }
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const data = JSON.stringify({ width, height, tiles, spawn });
  const encoded = btoa(data);
  const url = `${location.origin}${location.pathname.replace('editor.html','index.html')}?data=${encoded}`;
  try {
    await navigator.clipboard.writeText(url);
    alert('Share URL copied to clipboard');
  } catch (e) {
    console.error(e);
  }
});

