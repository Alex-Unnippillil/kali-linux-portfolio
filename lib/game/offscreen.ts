export function createOffscreenRenderer(canvas: HTMLCanvasElement, worker: Worker) {
  if (!('transferControlToOffscreen' in canvas)) {
    throw new Error('OffscreenCanvas not supported');
  }
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: offscreen }, [offscreen]);
  return worker;
}
