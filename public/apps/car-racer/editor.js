const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d');
const points = [];

// draw current points/track
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#555';
  ctx.beginPath();
  if (points.length) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 80;
    ctx.stroke();
  }
  for (const p of points) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(render);
}
render();

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  points.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  updateShare();
});

async function save() {
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle('car-racer-track.json', { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(points));
  await writable.close();
}

async function load() {
  const root = await navigator.storage.getDirectory();
  try {
    const file = await root.getFileHandle('car-racer-track.json');
    const data = await file.getFile();
    const text = await data.text();
    points.splice(0, points.length, ...JSON.parse(text));
    updateShare();
  } catch (e) {
    console.warn('No saved track');
  }
}

function updateShare() {
  const codeEl = document.getElementById('shareCode');
  try {
    const code = btoa(JSON.stringify(points));
    codeEl.value = code;
  } catch (e) {
    codeEl.value = '';
  }
}

document.getElementById('saveBtn').addEventListener('click', save);
document.getElementById('loadBtn').addEventListener('click', load);
