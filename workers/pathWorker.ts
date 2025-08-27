import { GRID_SIZE, getPath } from '../components/apps/tower-defense-core';

self.onmessage = (e: MessageEvent) => {
  const { towers, canvas } = e.data as any;
  const path = getPath(towers);
  if (canvas) {
    const ctx = (canvas as OffscreenCanvas).getContext('2d');
    if (ctx) {
      const cell = 32;
      (canvas as OffscreenCanvas).width = GRID_SIZE * cell;
      (canvas as OffscreenCanvas).height = GRID_SIZE * cell;
      ctx.clearRect(0, 0, (canvas as OffscreenCanvas).width, (canvas as OffscreenCanvas).height);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      path.forEach((p: any, i: number) => {
        const x = p.x * cell + cell / 2;
        const y = p.y * cell + cell / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }
  (self as any).postMessage({ path });
};
