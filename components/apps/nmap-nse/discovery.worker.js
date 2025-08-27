const WIDTH = 300;
const HEIGHT = 200;
let ctx;
let fogCtx;
let hosts = [];
let angle = 0;
let reduceMotion = false;
const sweep = Math.PI / 8;

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    const { canvas } = e.data;
    ctx = canvas.getContext('2d');
    reduceMotion = !!e.data.reduceMotion;
    const width = canvas.width || WIDTH;
    const height = canvas.height || HEIGHT;
    const fogCanvas = new OffscreenCanvas(width, height);
    fogCtx = fogCanvas.getContext('2d');
    fogCtx.fillStyle = 'rgba(0,0,0,0.6)';
    fogCtx.fillRect(0, 0, width, height);

    hosts = Array.from({ length: 5 }, (_, i) => {
      const x = width / 2 + 100 * Math.cos((i / 5) * 2 * Math.PI);
      const y = height / 2 + 100 * Math.sin((i / 5) * 2 * Math.PI);
      const hAngle = Math.atan2(y - height / 2, x - width / 2);
      return { x, y, angle: hAngle, discovered: false };
    });
    angle = 0;
    if (reduceMotion) {
      hosts.forEach((h) => {
        h.discovered = true;
      });
      fogCtx.clearRect(0, 0, width, height);
      draw(width, height, fogCanvas);
      self.postMessage({ message: 'Discovery map displayed without animation' });
    } else {
      draw(width, height, fogCanvas);
      self.requestAnimationFrame(() => tick(width, height, fogCanvas));
    }
  }
};

function draw(width, height, fogCanvas) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  hosts.forEach((host) => {
    if (host.discovered) {
      ctx.beginPath();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.moveTo(width / 2, height / 2);
      ctx.lineTo(host.x, host.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#4ade80';
      ctx.arc(host.x, host.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.drawImage(fogCanvas, 0, 0);
}

function tick(width, height, fogCanvas) {
  angle += 0.05;

  fogCtx.save();
  fogCtx.globalCompositeOperation = 'destination-out';
  fogCtx.translate(width / 2, height / 2);
  fogCtx.rotate(angle);
  fogCtx.beginPath();
  fogCtx.moveTo(0, 0);
  fogCtx.arc(0, 0, Math.max(width, height), -sweep / 2, sweep / 2);
  fogCtx.closePath();
  fogCtx.fill();
  fogCtx.restore();
  fogCtx.globalCompositeOperation = 'source-over';

  hosts.forEach((h, idx) => {
    if (!h.discovered) {
      const diff = (angle - h.angle + Math.PI * 2) % (Math.PI * 2);
      if (diff < sweep) {
        h.discovered = true;
        self.postMessage({ message: `Host ${idx + 1} discovered` });
      }
    }
  });

  draw(width, height, fogCanvas);

  if (angle < Math.PI * 2) {
    self.requestAnimationFrame(() => tick(width, height, fogCanvas));
  } else {
    self.postMessage({ message: 'Scan complete' });
  }
}
