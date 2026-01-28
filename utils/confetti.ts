type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
};

const COLORS = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];

export const burstConfetti = ({ particleCount = 80, spread = 60 }: ConfettiOptions = {}) => {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { innerWidth: width, innerHeight: height } = window;
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const originX = width / 2;
  const originY = height / 3;
  const particles = Array.from({ length: particleCount }, () => {
    const angle = (Math.random() - 0.5) * (spread * (Math.PI / 180));
    const speed = 3 + Math.random() * 4;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 60 + Math.random() * 30,
      size: 3 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });

  const gravity = 0.15;

  const tick = () => {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.life / 90, 0);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    if (particles.some((p) => p.life > 0 && p.y < height + 20)) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(tick);
};
