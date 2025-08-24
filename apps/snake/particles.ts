export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export const spawnParticles = (
  arr: Particle[],
  x: number,
  y: number,
  count = 8
) => {
  for (let i = 0; i < count; i++) {
    arr.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 30,
    });
  }
};

export const updateParticles = (arr: Particle[]) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0) arr.splice(i, 1);
  }
};
