const ctxCache: { ctx?: OffscreenCanvasRenderingContext2D } = {};

(self as any).onmessage = (e: MessageEvent) => {
  const data: any = e.data;
  if (data.canvas) {
    const canvas = data.canvas as OffscreenCanvas;
    ctxCache.ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    return;
  }
  const ctx = ctxCache.ctx;
  if (!ctx) return;
  const { snake, food, obstacles, particles, colors, gridSize, cellSize } = data;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, gridSize * cellSize, gridSize * cellSize);
  ctx.fillStyle = colors.obstacle;
  obstacles.forEach((o: any) => ctx.fillRect(o.x * cellSize, o.y * cellSize, cellSize, cellSize));
  ctx.fillStyle = colors.food;
  ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
  ctx.fillStyle = colors.snake;
  snake.forEach((s: any) => ctx.fillRect(s.x * cellSize, s.y * cellSize, cellSize, cellSize));
  if (particles) {
    ctx.fillStyle = colors.particle || '#ffffff';
    particles.forEach((p: any) => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
    });
    ctx.globalAlpha = 1;
  }
};
export {};
