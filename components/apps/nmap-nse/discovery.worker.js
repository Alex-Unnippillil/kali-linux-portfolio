const WIDTH = 300;
const HEIGHT = 200;
let ctx;
let hosts = [];
let step = 0;
let reduceMotion = false;

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    const { canvas } = e.data;
    ctx = canvas.getContext('2d');
    reduceMotion = !!e.data.reduceMotion;
    const width = canvas.width || WIDTH;
    const height = canvas.height || HEIGHT;
    hosts = Array.from({ length: 5 }, (_, i) => ({
      x: width / 2 + 100 * Math.cos((i / 5) * 2 * Math.PI),
      y: height / 2 + 100 * Math.sin((i / 5) * 2 * Math.PI),
      discovered: false,
      scripted: false,
    }));
    step = 0;
    if (reduceMotion) {
      hosts.forEach((h) => {
        h.discovered = true;
        h.scripted = true;
      });
      draw(width, height);
      self.postMessage({ message: 'Discovery map displayed without animation' });
    } else {
      draw(width, height);
      self.requestAnimationFrame(() => tick(width, height));
    }
  }
};

function draw(width, height) {
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
      ctx.fillStyle = host.scripted ? '#4ade80' : '#60a5fa';
      ctx.arc(host.x, host.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function tick(width, height) {
  if (step < hosts.length) {
    hosts[step].discovered = true;
    self.postMessage({ message: `Host ${step + 1} discovered` });
    step += 1;
    draw(width, height);
    self.requestAnimationFrame(() => tick(width, height));
  } else if (step < hosts.length * 2) {
    const idx = step - hosts.length;
    hosts[idx].scripted = true;
    self.postMessage({ message: `Script stage completed for host ${idx + 1}` });
    step += 1;
    draw(width, height);
    self.requestAnimationFrame(() => tick(width, height));
  } else {
    draw(width, height);
  }
}
